import differenceInMinutes from "date-fns/differenceInMinutes";
import isAfter from "date-fns/isAfter";

import {
  Client,
  AuthenticationProvider,
  PageIterator,
} from "@microsoft/microsoft-graph-client";
import * as MicrosoftGraph from "@microsoft/microsoft-graph-types";

import { CalendarClient, UpdateCredentials } from "./client";
import { Response, Attendance, Event } from "./event";

type OutlookEvent = MicrosoftGraph.Event;

function fromMsDate(date?: MicrosoftGraph.DateTimeTimeZone | null) {
  if (!date) return undefined;
  if (date.timeZone && date.timeZone !== "UTC") {
    throw new Error(`Unsupported timezone ${date.timeZone}`);
  }
  let d = date.dateTime;
  if (!d) return undefined;
  if (d[d.length - 1] !== "Z") {
    d = d + "Z";
  }
  return new Date(d);
}

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

class Auth implements AuthenticationProvider {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private credentials: any,
    private updateCredentials: UpdateCredentials
  ) {}

  /**
   * This method will get called before every request to the msgraph server
   * This should return a Promise that resolves to an accessToken (in case of success) or rejects with error (in case of failure)
   * Basically this method will contain the implementation for getting and refreshing accessTokens
   */
  public async getAccessToken(): Promise<string> {
    if (
      !this.credentials.expires_at ||
      isAfter(this.credentials.expires_at, new Date())
    ) {
      await this.refreshTokens();
    }
    return this.credentials.access_token;
  }

  private async refreshTokens() {
    const payload = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.credentials.refresh_token,
      grant_type: "refresh_token",
    };
    const body = new URLSearchParams(payload);
    const tokenResponse = await fetch(
      TOKEN_URL + "?" + new URLSearchParams(payload),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error(data);
      throw Error("Failed to refresh token");
    }
    this.credentials = data;

    await this.updateCredentials(this.credentials);
  }
}

export class OutlookClient extends CalendarClient {
  private client: Client;

  public constructor(
    clientId: string,
    clientSecret: string,
    credentials: any,
    updateCredentials: UpdateCredentials
  ) {
    super();
    const authProvider = new Auth(
      clientId,
      clientSecret,
      credentials,
      updateCredentials
    );
    this.client = Client.initWithMiddleware({ authProvider });
  }

  // Returns an array:
  // 0: array of items from the callback
  // 1: the deltaLink
  private transformResponse(response: string | null | undefined): Response {
    switch (response) {
      case "organizer":
      case "accepted":
        return "accepted";
      case "declined":
        return "declined";
      case "tentativelyAccepted":
        return "tentative";
      default:
        return null;
    }
  }

  private transformEvent(outlookEvent: OutlookEvent): Event | null {
    if (!outlookEvent.id || outlookEvent.isCancelled) {
      return null;
    }

    const start = fromMsDate(outlookEvent.start);
    const end = fromMsDate(outlookEvent.end);
    if (!start || !end) {
      return null;
    }

    const event = new Event(
      outlookEvent.seriesMasterId || outlookEvent.iCalUId || outlookEvent.id,
      outlookEvent.seriesMasterId ? outlookEvent.iCalUId || null : null,
      start,
      end,
      outlookEvent.subject || null,
      outlookEvent.bodyPreview,
      outlookEvent.location?.displayName
    );
    event.attendance =
      outlookEvent.attendees?.reduce?.((ret, attendee) => {
        const email = attendee.emailAddress?.address;
        if (!email) return ret;
        const response = this.transformResponse(attendee.status?.response);
        return [
          ...ret,
          {
            email,
            name: attendee.emailAddress?.name,
            response,
            isOrganizer:
              outlookEvent.organizer?.emailAddress?.address === email,
          } as Attendance,
        ];
      }, [] as Attendance[]) || [];
    if (outlookEvent.isOnlineMeeting) event.isOnline = true;
    event.isOnsite = outlookEvent.location?.locationType === "conferenceRoom";
    event.isOffsite =
      !event.isOnline &&
      !event.isOnsite &&
      !!outlookEvent.location?.displayName;
    event.raw = outlookEvent;
    return event;
  }

  public async *getEvents(
    calendarId: string,
    min: Date,
    max: Date,
    state: any
  ): AsyncIterableIterator<{ event: Event; state: any }> {
    const response = await this.client
      .api(
        state?.deltaLink ||
          `/me/calendarview/delta?startDateTime=${min.toISOString()}&endDateTime=${max.toISOString()}`
      )
      .get();

    let outlookEvent: OutlookEvent | undefined;
    const callback = (nextEvent: OutlookEvent) => {
      outlookEvent = nextEvent;
      return false;
    };

    let pageIterator = new PageIterator(this.client, response, callback);
    await pageIterator.iterate();
    while (true) {
      if (!outlookEvent) break;
      try {
        const event = this.transformEvent(outlookEvent);
        const deltaLink = pageIterator.getDeltaLink();
        state = {
          ...(state || {}),
          deltaLink,
        };
        if (event) yield { event, state };
      } catch (error) {
        console.error(`Failed to process event ${outlookEvent.id}`);
        console.error(error);
      }

      if (pageIterator.isComplete()) break;
      outlookEvent = undefined;
      await pageIterator.resume();
    }
  }
}
