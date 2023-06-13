import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@divvy/db";

import type { Attendance } from "@divvy/cal";
import { safeQuery } from "@divvy/db";

import {
  Event,
  RawEvent,
  Progress,
  CalendarClient,
  Credentials,
  GoogleClient,
  OutlookClient,
} from "@divvy/cal";

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
    const data = safeQuery(
      await this.supabase.from("account").select().eq("id", this.accountId)
    );
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
    safeQuery(
      await this.supabase.rpc("update_credentials", {
        account_id: this.accountId,
        new_credentials: credentials,
      })
    );
  }

  private async linkExistingSeries(eventId: number) {
    // TODO: This could be optimized for performance
    const newEvent = safeQuery(
      await this.supabase
        .from("event_stats")
        .select("title, attendees")
        .eq("id", eventId)
    );
    const title = newEvent?.[0]?.title;
    const attendees = newEvent?.[0]?.attendees;
    if (!title || !attendees) return;

    const existingMatches = safeQuery(
      await this.supabase
        .from("event_stats")
        .select("id, series")
        .neq("id", eventId)
        .eq("account_id", this.accountId)
        .eq("title", title)
        .eq("attendees", attendees)
    );
    if (!existingMatches || existingMatches.length === 0) return;

    let series = existingMatches?.[0]?.series;
    if (!series) {
      series = Math.random().toString(36).substring(2, 15);
      safeQuery(
        await this.supabase
          .from("event")
          .update({
            series,
          })
          .eq("id", existingMatches?.[0]?.id)
      );
    }
    safeQuery(
      await this.supabase
        .from("event")
        .update({
          series,
        })
        .eq("id", eventId)
    );
  }

  private async saveEvent(event: Event) {
    // Save event
    const data = safeQuery(
      await this.supabase
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
        .select()
    );
    const eventId = data?.[0]?.id;
    if (!eventId) throw Error("Failed to get event_id");

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

    return {
      eventId,
    };
  }

  private async saveRaw(rawEvent: RawEvent, eventId?: number) {
    await this.supabase.from("raw_event").insert({
      raw_event: rawEvent,
      account_id: this.accountId,
      event_id: eventId,
    });
  }

  private async saveProgress(progress?: Progress) {
    const sync_progress =
      progress === undefined
        ? null
        : Math.min(progress.count / progress.total, 1.0);
    await this.supabase
      .from("account")
      .update({
        sync_progress,
      })
      .eq("id", this.accountId);
  }

  private async saveAttendee(eventId: number, attendee: Attendance) {
    let name = attendee.name;
    if (name) {
      // Remove email address from name
      name = name.replace(/<?[^ ]+@[^ ]+>?/, "").trim();
      // Re-order Last, First to First Last
      name = name.replace(/^([^, ]+),\s*(.+)/, "$2 $1");
    }
    let data;
    data = safeQuery(
      await this.supabase
        .from("account")
        .upsert(
          {
            email: attendee.email,
            ...(name && { name }),
          },
          { onConflict: "email" }
        )
        .select()
    );
    const attendeeAccountId = data?.[0]?.id;
    if (!attendeeAccountId) throw Error("Account missing");
    safeQuery(
      await this.supabase
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
        .select()
    );
  }

  public async syncEvents(
    min: Date,
    max: Date,
    calendar = "primary",
    errorLogger?: (error: any) => void
  ) {
    let successCount = 0;
    let errorCount = 0;
    if (!this.calendar) throw Error("Calendar not initialized");
    for await (const { rawEvent, progress } of this.calendar.getEvents(
      calendar,
      min,
      max,
      {}
    )) {
      let eventId = undefined;
      try {
        const event = this.calendar.transform(rawEvent);
        ({ eventId } = await this.saveEvent(event));
        successCount += 1;
      } catch (e) {
        errorCount += 1;
        errorLogger?.(e);
      }
      try {
        await this.saveRaw(rawEvent, eventId);
        if (progress.count % 10 === 0) {
          await this.saveProgress(progress);
        }
      } catch (e) {
        errorLogger?.(e);
      }
    }
    try {
      await this.saveProgress();
      if (successCount > 0 || errorCount === 0) {
        await this.supabase
          .from("account")
          .update({
            synced_at: "now()",
          })
          .eq("id", this.accountId);
      }
    } catch (e) {
      errorLogger?.(e);
    }
  }
}
