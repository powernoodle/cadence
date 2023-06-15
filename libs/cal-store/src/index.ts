import { Client } from "pg";
import { format as pgFormat } from "@scaleleap/pg-format";

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
  private db: Client;
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
    await this.db.end();
  }

  private constructor(dbUrl: string, public accountId: number) {
    this.db = new Client(dbUrl);
  }

  private async init(
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string
  ) {
    await this.db.connect();
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

  private async query(q: string, params?: any[]) {
    const result = await this.db.query(q, params);
    return result.rows;
  }

  private loadCredentials = async () => {
    const data = await this.query("SELECT * FROM account WHERE id = $1", [
      this.accountId,
    ]);
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
    await this.query("SELECT update_credentials($1, $2)", [
      this.accountId,
      credentials,
    ]);
  }

  private async linkSeries() {
    await this.query("SELECT link_series($1)", [this.accountId]);
  }

  private async saveEvent(event: Event) {
    const data = await this.query(
      `
        INSERT INTO event (account_id, at, title, cal_id, series, is_meeting, is_offsite, is_online, is_onsite)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (account_id, cal_id) DO UPDATE SET
            at = EXCLUDED.at,
            title = EXCLUDED.title,
            series = EXCLUDED.series,
            is_meeting = EXCLUDED.is_meeting,
            is_offsite = EXCLUDED.is_offsite,
            is_online = EXCLUDED.is_online,
            is_onsite = EXCLUDED.is_onsite
        RETURNING id
      `,
      [
        this.accountId,
        `[${event.start?.toISOString()},${event.end?.toISOString()})`,
        event.title,
        event.id,
        event.series,
        event.isMeeting,
        event.isOffsite,
        event.isOnline,
        event.isOnsite,
      ]
    );
    const eventId = data[0]?.id;
    if (!eventId) throw Error("Failed to get event_id");

    await this.saveAttendees(eventId, event.attendance);

    return {
      eventId,
    };
  }

  private async saveRaw(rawEvent: RawEvent, eventId?: number) {
    await this.query(
      "INSERT INTO raw_event(raw_event, account_id, event_id) VALUES($1, $2, $3)",
      [rawEvent, this.accountId, eventId || null]
    );
  }

  private async saveProgress(progress?: Progress) {
    const syncProgress =
      progress === undefined
        ? null
        : Math.min(progress.count / progress.total, 1.0);
    await this.query("UPDATE account SET sync_progress = $1 WHERE id = $2", [
      syncProgress,
      this.accountId,
    ]);
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
    const missingAccounts: [string, string | null][] = [];
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
        missingAccounts.push([attendee.email, name]);
      }
    }

    if (missingAccounts.length) {
      const data = await this.query(
        pgFormat(
          `
            WITH input_rows(email, name) AS (
              VALUES %L
            ),
            ins AS (
              INSERT INTO account (email, name)
              SELECT * FROM input_rows
              ON CONFLICT (email) DO NOTHING
              RETURNING id, email, name
            )
            SELECT 'i' AS source                           -- 'i' for 'inserted'
                , id, email, name
            FROM   ins
            UNION  ALL
            SELECT 's' AS source                           -- 's' for 'selected'
                , a.id, a.email, a.name
            FROM   input_rows
            JOIN   account a USING (email);           -- columns of unique index
          `,
          missingAccounts
        )
      );
      for (const account of data) {
        this.accountIds[account.email] = account.id;
        if (!account.name) {
          const name = missingAccounts.find((a) => account.email === a[0])?.[1];
          if (name) {
            this.newNames[account.id] = name;
          } else {
            this.missingNames[account.id] = true;
          }
        }
      }
    }

    // bulk write attendees
    const dbAttendees = attendees.map((attendee) => {
      return [
        eventId,
        this.accountIds[attendee.email],
        attendee.response || null,
        !!attendee.isOrganizer,
      ];
    });
    await this.query(
      pgFormat(
        `
          INSERT INTO attendee (event_id, account_id, response, is_organizer)
          VALUES %L
          ON CONFLICT (event_id, account_id) DO
              UPDATE SET response = excluded.response, is_organizer = excluded.is_organizer
        `,
        dbAttendees
      )
    );
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
        await this.query("UPDATE account SET synced_at = $1 WHERE id = $2", [
          now,
          this.accountId,
        ]);
      }
    } catch (e) {
      errorLogger?.(e);
    }
  }
}
