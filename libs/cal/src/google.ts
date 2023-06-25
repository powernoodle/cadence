// foo
import { jsonFetch as fetch } from "@worker-tools/json-fetch";

import { calendar_v3 } from "google-schema";

import { Response, Attendance, Event, EventError } from "./event";
import {
  CalendarClient,
  UpdateCredentials,
  RawEvent,
  Progress,
} from "./client";

type GoogleEvent = calendar_v3.Schema$Event;
type GoogleEvents = calendar_v3.Schema$Events;

function toGoogleDate(d: Date) {
  function pad(n: number) {
    return n < 10 ? "0" + n : n;
  }
  return (
    d.getUTCFullYear() +
    "-" +
    pad(d.getUTCMonth() + 1) +
    "-" +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    ":" +
    pad(d.getUTCMinutes()) +
    ":" +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export class GoogleClient extends CalendarClient {
  public constructor(
    public accountEmail: string,
    private clientId: string,
    private clientSecret: string,
    private credentials: any,
    private updateCredentials: UpdateCredentials
  ) {
    super();
  }

  private async refreshTokens() {
    const payload = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.credentials.refresh_token,
      grant_type: "refresh_token",
    };
    const body = new URLSearchParams(payload);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) {
      const error = await response.text();
      console.error(error);
      throw new Error(error);
    }
    this.credentials = {
      ...this.credentials,
      ...response.json(),
    };
    await this.updateCredentials(this.credentials);
  }

  private async api<T>(
    method: string,
    url: string,
    params: { [key: string]: any }
  ) {
    const headers = {
      Authorization: `Bearer ${this.credentials.access_token}`,
      Accept: "application/json",
    };
    const query = new URLSearchParams(params);
    let retry = true;
    while (true) {
      const response = await fetch(url + "?" + query.toString(), {
        method,
        headers,
      });
      switch (response.status) {
        case 401:
          if (retry) {
            await this.refreshTokens();
            retry = false;
          } else {
            throw new Error(await response.text());
          }
          break;
        case 200:
          return (await response.json()) as T;
        default:
          throw new Error(await response.text());
      }
    }
  }

  private transformResponse(response: string | null | undefined): Response {
    switch (response) {
      case "accepted":
        return "accepted";
      case "declined":
        return "declined";
      case "tentative":
        return "tentative";
      default:
        return null;
    }
  }

  private transformEvent(googleEvent: GoogleEvent): Event[] {
    const id = googleEvent.id;
    if (!id) {
      throw new Error("Missing ID");
    }

    const startString = googleEvent.start?.dateTime || googleEvent.start?.date;
    if (!startString) {
      throw new Error("Missing start");
    }
    const endString = googleEvent.end?.dateTime || googleEvent.end?.date;
    if (!endString) {
      throw new Error("Missing end");
    }

    const isOnline = !!googleEvent.conferenceData;
    const isOnsite = !!googleEvent.attendees?.some((a) => a.resource);
    const organizerEmail = googleEvent.organizer?.email?.toLowerCase();
    const attendance =
      googleEvent.attendees?.reduce?.((ret, attendee) => {
        if (!attendee.email || attendee.resource) return ret;
        return [
          ...ret,
          {
            email: attendee.email?.toLowerCase(),
            name: attendee.displayName,
            response: this.transformResponse(attendee.responseStatus),
            isOrganizer: organizerEmail === attendee.email,
            isSelf: attendee.self,
          } as Attendance,
        ];
      }, [] as Attendance[]) || [];
    const start = new Date(startString);
    const end = new Date(endString);
    const days = Event.SplitDays(start, end);
    return days.map(
      (day) =>
        new Event({
          id,
          accountEmail: this.accountEmail,
          series: googleEvent.recurringEventId || undefined,
          start: day.start,
          end: day.end,
          title: googleEvent.summary || undefined,
          description: googleEvent.description || undefined,
          location: googleEvent.location || undefined,
          isOnline,
          isOnsite,
          isCancelled: googleEvent.status === "cancelled",
          isPrivate: googleEvent.visibility === "private",
          notMeeting:
            days.length > 1 ||
            googleEvent.transparency === "transparent" ||
            googleEvent.eventType !== "default",
          attendance,
        })
    );
  }

  public async *getEvents(
    calendarId: string,
    min: Date,
    max: Date,
    state: any
  ): AsyncIterableIterator<{
    rawEvent: RawEvent;
    progress: Progress;
    state: any;
  }> {
    let syncToken: string | null = state?.syncToken;
    let nextPageToken: string | null = null;
    let total = 0;
    let count = 0;

    do {
      try {
        // https://developers.google.com/calendar/v3/reference/events/list
        const data: GoogleEvents = await this.api(
          "GET",
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            ...(nextPageToken
              ? {
                  pageToken: nextPageToken,
                }
              : syncToken
              ? {
                  syncToken,
                }
              : {
                  timeMin: toGoogleDate(min), // lower bound on end time
                  timeMax: toGoogleDate(max), // upper bound on start time
                  singleEvents: true,
                }),
          }
        );
        syncToken = data.nextSyncToken || syncToken;
        state = {
          ...state,
          syncToken,
        };
        const events = data.items || [];
        // Since Google doesn't return a total count, we always assume the next
        // page has the same count as the current, and that there's only one
        // more page.
        total += events.length + (data.nextPageToken ? events.length : 0);
        for (const googleEvent of events) {
          count += 1;
          const rawEvent = {
            provider: "google",
            data: googleEvent,
          };
          yield { rawEvent, progress: { count, total }, state };
        }
        nextPageToken = data.nextPageToken || null;
      } catch (error) {
        console.error(error);
        throw error;
      }
    } while (nextPageToken);
  }

  public transform(rawEvent: RawEvent): Event[] {
    try {
      return this.transformEvent(rawEvent.data);
    } catch (caught) {
      throw new EventError("Event transformation failed", rawEvent, caught);
    }
  }
}
