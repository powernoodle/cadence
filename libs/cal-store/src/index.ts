import knex, { Knex } from "knex";

import type { Attendance } from "@divvy/cal";
import { EventError } from "@divvy/cal";

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
  private db: Knex;
  private calendar?: CalendarClient;

  public static async Create(
    dbUrl: string,
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string,
    accountId: number
  ) {
    const client = new CalendarStore(dbUrl, accountId);
    await client.init(
      googleClientId,
      googleOauthSecret,
      outlookClientId,
      outlookOauthSecret
    );
    return client;
  }

  public async close() {
    await this.db.destroy();
  }

  private constructor(dbUrl: string, public accountId: number) {
    this.db = knex({
      client: "pg",
      connection: dbUrl,
      searchPath: ["public"],
    });
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
    const data = await this.db
      .select()
      .from("account")
      .where("id", this.accountId);
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
    await this.db.raw("SELECT update_credentials(?, ?)", [
      this.accountId,
      credentials,
    ]);
  }

  private async linkSeries() {
    await this.db.raw("SELECT link_series(?)", this.accountId);
  }

  private async saveEvent(event: Event) {
    const data = await this.db("event")
      .insert({
        account_id: this.accountId,
        at: `[${event.start?.toISOString()},${event.end?.toISOString()})`,
        title: event.title,
        cal_id: event.id,
        series: event.series,
        is_meeting: event.isMeeting,
        is_offsite: event.isOffsite,
        is_online: event.isOnline,
        is_onsite: event.isOnsite,
      })
      .onConflict(["account_id", "cal_id"])
      .merge()
      .returning("id");
    const eventId = data[0]?.id;
    if (!eventId) throw Error("Failed to get event_id");

    await this.saveAttendees(eventId, event.attendance);

    return {
      eventId,
    };
  }

  private async saveRaw(rawEvent: RawEvent, eventId?: number) {
    await this.db("raw_event").insert({
      rawEvent,
      account_id: this.accountId,
      event_id: eventId || null,
    });
  }

  private async saveProgress(progress?: Progress) {
    const syncProgress =
      progress === undefined
        ? null
        : Math.min(progress.count / progress.total, 1.0);
    await this.db("account")
      .where("id", this.accountId)
      .update({ sync_progress: syncProgress });
  }

  private formatName(name: string | null | undefined) {
    if (!name) return null;
    // Remove email address from name
    name = name.replace(/<?[^ ]+@[^ ]+>?/, "").trim();
    // Re-order Last, First to First Last
    name = name.replace(/^([^, ]+),\s*(.+)/, "$2 $1");
    return name;
  }

  private accountIds: { [email: string]: number } = {};
  private newNames: { [id: number]: string } = {};
  private missingNames: { [id: number]: boolean } = {};
  private async saveAttendees(eventId: number, attendees: Attendance[]) {
    // populate cache with missing IDs
    for (const attendee of attendees) {
      if (attendee.email in this.accountIds) {
        const id = this.accountIds[attendee.email];
        if (this.missingNames[id]) {
          const name = this.formatName(attendee.name);
          if (name) {
            this.newNames[this.accountIds[attendee.email]] = name;
            delete this.missingNames[id];
          }
        }
      } else {
        const name = this.formatName(attendee.name);
        const data = await this.db("account")
          .insert({ email: attendee.email, name })
          .onConflict("email")
          .merge()
          .returning(["id", "name"]);
        this.accountIds[attendee.email] = data[0]?.id;
        if (!data[0]?.name) {
          if (name) {
            this.newNames[data[0].id] = name;
          } else {
            this.missingNames[data[0].id] = true;
          }
        }
      }
    }
    const dbAttendees = attendees.map((attendee) => {
      return {
        event_id: eventId,
        account_id: this.accountIds[attendee.email],
        response: attendee.isOrganizer || null,
        is_organizer: !!attendee.isOrganizer,
      };
    });

    // track new names
    // bulk write attendees
    await this.db("attendee")
      .insert(dbAttendees)
      .onConflict(["event_id", "account_id"])
      .merge();
  }

  private async saveNames() {
    //    INSERT INTO attendee (event_id, account_id, response, is_organizer)
    //     VALUES ($1, $2, $3, $4)
    //     ON CONFLICT (event_id, account_id) DO
    //         UPDATE SET response = excluded.response, is_organizer = excluded.is_organizer
    //   `,
    //     [eventId, data[0].id, dbAttendee.response, dbAttendee.is_organizer]
    //   );
    // for (const attendee of attendees) {
    //   const dbAttendee = {
    //     email: attendee.email,
    //     response: attendee.response || null,
    //     is_organizer: !!attendee.isOrganizer,
    //     name: name || null,
    //   };
    // }
  }

  public async syncEvents(
    min: Date,
    max: Date,
    calendar = "primary",
    errorLogger?: (error: any) => void
  ) {
    let now = new Date();

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
        errorLogger?.(new EventError("Error saving event", rawEvent, e));
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
      await this.linkSeries();
      await this.saveNames();
      await this.saveProgress();
      if (successCount > 0 || errorCount === 0) {
        await this.db("account")
          .where("id", this.accountId)
          .update({ synced_at: now });
      }
    } catch (e) {
      errorLogger?.(e);
    }
  }
}
