import { Client } from "pg";
import { format as pgFormat } from "@scaleleap/pg-format";
import { formatInTimeZone } from "date-fns-tz";
import { eachDayOfInterval } from "@divvy/tz";

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

// TODO: load this from the account
export const USER_TZ = "America/New_York";

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
    const { email, provider, access_token, refresh_token } =
      await this.loadCredentials();
    const credentials = { access_token, refresh_token };
    if (provider === "google") {
      this.calendar = new GoogleClient(
        email,
        googleClientId,
        googleOauthSecret,
        credentials,
        async (creds: any) => {
          await this.saveCredentials(creds);
        }
      );
    } else if (provider === "azure") {
      this.calendar = new OutlookClient(
        email,
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
    const email = data[0].email;
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
    return { email, provider, access_token, refresh_token };
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

  private async calculateDays(start: Date, end: Date) {
    console.log(`Recalculating ${this.accountId} days ${start} to ${end}`);
    const days = eachDayOfInterval({ start: start, end: end }, USER_TZ);
    for (let batch = 0; batch < days.length / 10; batch += 1) {
      let query = "";
      for (const day of days.slice(batch * 10, (batch + 1) * 10)) {
        query += pgFormat(
          "SELECT calculate_day(%L, %L); ",
          this.accountId,
          formatInTimeZone(day, USER_TZ, "yyyy-MM-dd")
        );
      }
      await this.query(query);
    }
  }

  private async saveEvent(event: Event, sequence?: number) {
    const data = await this.query(
      `
        INSERT INTO event (account_id, day, at, title, cal_id, series, type, is_offsite, is_online, is_onsite, response, is_cancelled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (account_id, cal_id) DO UPDATE SET
            day = EXCLUDED.day,
            at = EXCLUDED.at,
            title = EXCLUDED.title,
            series = EXCLUDED.series,
            type = EXCLUDED.type,
            is_offsite = EXCLUDED.is_offsite,
            is_online = EXCLUDED.is_online,
            is_onsite = EXCLUDED.is_onsite,
            response = EXCLUDED.response,
            is_cancelled = EXCLUDED.is_cancelled
        RETURNING id
      `,
      [
        this.accountId,
        formatInTimeZone(event.start, USER_TZ, "yyyy-MM-dd"),
        `[${event.start?.toISOString()},${event.end?.toISOString()})`,
        event.title,
        sequence ? `${event.id}:${sequence}` : event.id,
        event.series,
        event.type,
        event.isOffsite,
        event.isOnline,
        event.isOnsite,
        event.response,
        event.isCancelled,
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

  private contactIds: { [email: string]: number } = {};
  private newNames: [number, string][] = [];
  private missingNames: { [id: number]: boolean } = {};
  private async saveAttendees(eventId: number, attendees: Attendance[]) {
    // populate cache with missing IDs
    const missingContacts: [string, string | null][] = [];
    for (const attendee of attendees) {
      if (attendee.email in this.contactIds) {
        const id = this.contactIds[attendee.email];
        if (this.missingNames[id]) {
          const name = this.formatName(attendee.name);
          if (name) {
            this.newNames.push([this.contactIds[attendee.email], name]);
            delete this.missingNames[id];
          }
        }
      } else {
        const name = this.formatName(attendee.name);
        missingContacts.push([attendee.email, name]);
      }
    }

    if (missingContacts.length) {
      const data = await this.query(
        pgFormat(
          `
            WITH input_rows(email, name) AS (
              VALUES %L
            ),
            ins AS (
              INSERT INTO contact (account_id, hash, email, name)
              SELECT %L, encode(digest(email, 'sha256'), 'hex'), email, name FROM input_rows
              ON CONFLICT (account_id, hash) DO NOTHING
              RETURNING id, hash, email, name
            )
            SELECT 'i' AS source                      -- 'i' for 'inserted'
                , id, email, name
            FROM   ins
            UNION  ALL
            SELECT 's' AS source                      -- 's' for 'selected'
                , c.id, c.email, c.name
            FROM   input_rows
            JOIN   contact c USING (email);            -- columns of unique index
          `,
          missingContacts,
          this.accountId
        )
      );
      for (const contact of data) {
        this.contactIds[contact.email] = parseInt(contact.id);
        if (!contact.name) {
          const name = missingContacts.find((a) => contact.email === a[0])?.[1];
          if (name) {
            this.newNames.push([parseInt(contact.id), name]);
          } else {
            this.missingNames[contact.id] = true;
          }
        }
      }
    }

    // bulk write attendees
    const dbAttendees = attendees.map((attendee) => {
      return [
        eventId,
        this.contactIds[attendee.email],
        attendee.response || null,
        !!attendee.isOrganizer,
      ];
    });
    await this.query(
      pgFormat(
        `
          INSERT INTO attendee (event_id, contact_id, response, is_organizer)
          VALUES %L
          ON CONFLICT (event_id, contact_id) DO
              UPDATE SET response = excluded.response, is_organizer = excluded.is_organizer
        `,
        dbAttendees
      )
    );
  }

  private async saveNames() {
    if (this.newNames.length === 0) return;
    const query = pgFormat(
      `
          UPDATE contact AS c
          SET name = n.name
          FROM ( VALUES %L ) AS n(id, name)
          WHERE c.id = n.id
        `,
      this.newNames
    );
    await this.query(query);
  }

  private async processRawEvent(rawEvent: RawEvent) {
    if (!this.calendar) throw Error("Calendar not initialized");
    const events = this.calendar.transform(rawEvent);
    let eventId = undefined;
    ({ eventId } = await this.saveEvent(events[0]));
    let sequence = 1;
    for (const event of events.slice(1)) {
      await this.saveEvent(event, sequence);
      sequence += 1;
    }
    return { event: events[0], eventId };
  }

  public async syncEvents(
    min: Date,
    max: Date,
    calendar = "primary",
    errorLogger?: (error: any) => void
  ) {
    let successCount = 0;
    let errorCount = 0;
    try {
      await this.query(
        "UPDATE account SET sync_started_at = $1 WHERE id = $2",
        [new Date(), this.accountId]
      );
    } catch (e) {
      console.error(e);
    }
    if (!this.calendar) throw Error("Calendar not initialized");
    for await (const { rawEvent, progress } of this.calendar.getEvents(
      calendar,
      min,
      max,
      {}
    )) {
      let eventId;
      try {
        ({ eventId } = await this.processRawEvent(rawEvent));
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
    await this.finalizeProcessing(min, max, errorLogger);
    try {
      await this.saveProgress();
      if (successCount > 0 || errorCount === 0) {
        await this.query("UPDATE account SET synced_at = $1 WHERE id = $2", [
          new Date(),
          this.accountId,
        ]);
      }
    } catch (e) {
      errorLogger?.(e);
    }
  }

  private async finalizeProcessing(
    min: Date,
    max: Date,
    errorLogger?: (error: any) => void
  ) {
    try {
      await this.linkSeries();
    } catch (e) {
      errorLogger?.(e);
    }
    try {
      await this.saveNames();
    } catch (e) {
      errorLogger?.(e);
    }
    try {
      await this.calculateDays(min, max);
    } catch (e) {
      errorLogger?.(e);
    }
  }

  public async reprocessEvents(errorLogger?: (error: any) => void) {
    try {
      const account = await this.query(
        "SELECT sync_started_at from account WHERE id = $1",
        [this.accountId]
      );
      if (!account?.length) {
        throw Error(`Account ${this.accountId} not found`);
      }
      const sync_start = account[0].sync_started_at;
      if (!sync_start) {
        throw Error(`Account ${this.accountId} has no previous sync`);
      }
      const data = await this.query(
        "SELECT * from raw_event WHERE account_id = $1 AND created_at >= $2",
        [this.accountId, sync_start]
      );

      let min: Date | undefined;
      let max: Date | undefined;
      console.log(`Reprocessing ${data.length} events`);
      for (const row of data) {
        let rawEvent = row.raw_event;
        // There was a bug where the whole row was written into the raw_event
        // field
        if (rawEvent.raw_event) rawEvent = rawEvent.raw_event;
        try {
          const { event } = await this.processRawEvent(rawEvent);
          if (!min || event.start.getTime() < min.getTime()) min = event.start;
          if (!max || event.end.getTime() > max.getTime()) max = event.end;
        } catch (e) {
          errorLogger?.(new EventError("Error saving event", rawEvent, e));
        }
      }

      if (min && max) {
        await this.finalizeProcessing(min, max, errorLogger);
      }
    } catch (e) {
      errorLogger?.(e);
    }
  }
}
