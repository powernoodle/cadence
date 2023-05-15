import differenceInMinutes from "date-fns/differenceInMinutes";

import { google, calendar_v3, Auth } from "googleapis";

import { Response, Attendance, Event } from "./event";
import { CalendarClient, UpdateCredentials } from "./client";

type GoogleEvent = calendar_v3.Schema$Event;

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

type GoogleCredentials = {
  access_token: string;
  refresh_token: string;
};

export class GoogleClient extends CalendarClient {
  private authClient?: Auth.OAuth2Client;
  private client?: calendar_v3.Calendar;

  public constructor(
    private clientId: string,
    private clientSecret: string,
    public credentials: GoogleCredentials,
    protected updateCredentials: UpdateCredentials
  ) {
    super();
    this.authClient = new google.auth.OAuth2(this.clientId, this.clientSecret);
    this.authClient.setCredentials(this.credentials);
    this.client = google.calendar({ version: "v3", auth: this.authClient });
    this.authClient.on("tokens", async (tokens: any) => {
      this.updateCredentials(tokens);
    });
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

  private transformEvent(event: GoogleEvent): Event | null {
    if (!event.iCalUID || !event.start?.dateTime || !event.end?.dateTime) {
      return null;
    }

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return {
      start,
      end,
      length: differenceInMinutes(end, start),
      attendance:
        event.attendees?.reduce?.((ret, attendee) => {
          if (!attendee.email || attendee.resource) return ret;
          return [
            ...ret,
            {
              email: attendee.email,
              name: attendee.displayName,
              response: this.transformResponse(attendee.responseStatus),
            } as Attendance,
          ];
        }, [] as Attendance[]) || [],
      title: event.summary || null,
      description: event.description || null,
      location: event.location || null,
      organizer: event.organizer?.email || null,
      uid: event.iCalUID,
      recurrenceId: event.originalStartTime?.toString() || null,
    };
  }

  public async *getCalendars(): AsyncIterableIterator<calendar_v3.Schema$CalendarListEntry> {
    let syncToken: string | undefined;
    let nextPageToken: string | undefined;

    do {
      try {
        // https://developers.google.com/calendar/v3/reference/events/list
        const data = (
          await this.client!.calendarList.list({
            ...(nextPageToken
              ? {
                  pageToken: nextPageToken,
                }
              : syncToken
              ? {
                  syncToken,
                }
              : {
                  minAccessRole: "reader",
                  showHidden: true,
                  showDeleted: true,
                }),
          })
        ).data as calendar_v3.Schema$CalendarList;
        syncToken = data.nextSyncToken || syncToken;
        const calendars = data.items || [];
        for (const calendar of calendars) {
          try {
            yield calendar;
          } catch (error) {
            console.error(
              `Failed to update event: ${JSON.stringify(calendar)}`
            );
            console.error(error);
          }
        }
        nextPageToken = data.nextPageToken || undefined;
      } catch (error) {
        console.error(error);
        throw error;
      }
    } while (nextPageToken);
  }

  public async *getEvents(
    calendarId: string,
    min: Date,
    max: Date,
    state: any
  ): AsyncIterableIterator<{ event: Event; state: any }> {
    let syncToken: string | null = state?.syncToken;
    let nextPageToken: string | null = null;

    do {
      try {
        // https://developers.google.com/calendar/v3/reference/events/list
        const data = (
          await this.client!.events.list({
            calendarId,
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
                }),
          })
        ).data as calendar_v3.Schema$Events;
        syncToken = data.nextSyncToken || syncToken;
        state = {
          ...state,
          syncToken,
        };
        const events = data.items || [];
        for (const googleEvent of events) {
          try {
            if (!googleEvent.id) return;

            console.log(googleEvent);
            const event = this.transformEvent(googleEvent);
            if (event) yield { event, state };
          } catch (error) {
            console.error(
              `Failed to update event: ${JSON.stringify(googleEvent)}`
            );
            console.error(error);
          }
        }
        nextPageToken = data.nextPageToken || null;
      } catch (error) {
        console.error(error);
        throw error;
      }
    } while (nextPageToken);
  }
}
