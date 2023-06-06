import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cadence/db";

import type { Attendance } from "@cadence/cal";
import { Event } from "@cadence/cal";

import {
  CalendarClient,
  Credentials,
  GoogleClient,
  OutlookClient,
} from "@cadence/cal";

export class CalendarStore {
  private supabase: SupabaseClient<Database>;
  private calendar?: CalendarClient;

  public static async Create(
    supabaseUrl: string,
    supabaseKey: string,
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string,
    accountId: number
  ) {
    const client = new CalendarStore(supabaseUrl, supabaseKey, accountId);
    await client.init(
      googleClientId,
      googleOauthSecret,
      outlookClientId,
      outlookOauthSecret
    );
    return client;
  }

  private constructor(
    supabaseUrl: string,
    supabaseKey: string,
    public accountId: number
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  private async init(
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string
  ) {
    const { provider, access_token, refresh_token } =
      await this.loadCredentials();
    const credentials = { access_token, refresh_token };
    if (provider === "google") {
      this.calendar = new GoogleClient(
        googleClientId,
        googleOauthSecret,
        credentials,
        async (creds: any) => {
          await this.saveCredentials(creds);
        }
      );
    } else if (provider === "azure") {
      this.calendar = new OutlookClient(
        outlookClientId,
        outlookOauthSecret,
        credentials,
        async (creds: any) => {
          await this.saveCredentials(creds);
        }
      );
    } else {
      throw Error(`Unknown provider: ${provider}`);
    }
  }

  private loadCredentials = async () => {
    const { data, error } = await this.supabase
      .from("account")
      .select()
      .eq("id", this.accountId);
    if (error) throw error;
    if (!data?.length) {
      throw Error(`Account ${this.accountId} not found`);
    }
    const provider = data[0].provider;
    if (!provider) {
      console.error(`Account ${this.accountId} missing provider`);
      throw Error("Missing provider");
    }
    if (!data[0].credentials) {
      console.error(`Account ${this.accountId} missing credentials`);
      throw Error("Missing credentials");
    }
    const credentials = data[0].credentials as Credentials;
    const access_token = credentials.access_token as string | undefined;
    if (!access_token) {
      console.error(`Account ${this.accountId} missing access_token`);
      throw Error("Missing access token");
    }
    const refresh_token = credentials.refresh_token as string | undefined;
    if (!refresh_token) {
      console.error(`Account ${this.accountId} missing refresh_token`);
      throw Error("Missing refresh token");
    }
    return { provider, access_token, refresh_token };
  };

  private async saveCredentials(credentials: any) {
    const { error } = await this.supabase.rpc("update_credentials", {
      account_id: this.accountId,
      new_credentials: credentials,
    });
    if (error) throw error;
  }

  private async linkExistingSeries(eventId: number) {
    // TODO: This could be optimized for performance
    const { data: newEvent } = await this.supabase
      .from("event_stats")
      .select("title, attendees")
      .eq("id", eventId);
    const title = newEvent?.[0]?.title;
    const attendees = newEvent?.[0]?.attendees;
    if (!title || !attendees) return;

    const { data: existingMatches } = await this.supabase
      .from("event_stats")
      .select("id, series")
      .neq("id", eventId)
      .eq("account_id", this.accountId)
      .eq("title", title)
      .eq("attendees", attendees);
    if (!existingMatches || existingMatches.length === 0) return;

    let series = existingMatches?.[0]?.series;
    if (!series) {
      series = Math.random().toString(36).substring(2, 15);
      await this.supabase
        .from("event")
        .update({
          series,
        })
        .eq("id", existingMatches?.[0]?.id);
    }
    await this.supabase
      .from("event")
      .update({
        series,
      })
      .eq("id", eventId);
  }

  private async saveEvent(event: Event) {
    // Save event
    const { data, error } = await this.supabase
      .from("event")
      .upsert(
        {
          account_id: this.accountId,
          at: `[${event.start?.toISOString()},${event.end?.toISOString()})`,
          title: event.title,
          cal_id: event.id,
          series: event.series,
          is_meeting: event.isMeeting,
          is_offsite: event.isOffsite,
          is_online: event.isOnline,
          is_onsite: event.isOnsite,
        },
        { onConflict: "account_id, cal_id" }
      )
      .select();
    if (error) throw error;
    const eventId = data?.[0]?.id;
    if (!eventId) throw Error("Failed to get event_id");

    // Save raw event
    await this.supabase.from("raw_event").upsert({
      event_id: eventId,
      ical: event.raw,
    });

    // Save attendees
    for (const attendee of event.attendance) {
      try {
        await this.saveAttendee(eventId, attendee);
      } catch (e) {
        console.error(e);
      }
    }

    // Link to existing series
    await this.linkExistingSeries(eventId);
  }

  private async saveAttendee(eventId: number, attendee: Attendance) {
    let name = attendee.name;
    if (name) {
      // Remove email address from name
      name = name.replace(/<?[^ ]+@[^ ]+>?/, "").trim();
      // Re-order Last, First to First Last
      name = name.replace(/^([^, ]+),\s*(.+)/, "$2 $1");
    }
    let data, error;
    ({ data, error } = await this.supabase
      .from("account")
      .upsert(
        {
          email: attendee.email,
          ...(name && { name }),
        },
        { onConflict: "email" }
      )
      .select());
    if (error) throw error;
    const attendeeAccountId = data?.[0]?.id;
    if (!attendeeAccountId) throw Error("Account missing");
    ({ error } = await this.supabase
      .from("attendee")
      .upsert(
        {
          event_id: eventId,
          account_id: attendeeAccountId,
          response: attendee.response,
          is_organizer: attendee.isOrganizer,
        },
        { onConflict: "event_id, account_id" }
      )
      .select());
    if (error) throw error;
  }

  public async syncEvents(min: Date, max: Date) {
    if (!this.calendar) throw Error("Calendar not initialized");
    for await (const { event } of this.calendar.getEvents(
      "primary",
      min,
      max,
      {}
    )) {
      try {
        await this.saveEvent(event);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
