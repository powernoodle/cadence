import isAfter from "date-fns/isAfter";
import { jsonFetch as fetch } from "@worker-tools/json-fetch";

import {
  Client,
  AuthenticationProvider,
  PageIterator,
} from "@microsoft/microsoft-graph-client";
import * as MicrosoftGraph from "@microsoft/microsoft-graph-types";

import {
  CalendarClient,
  UpdateCredentials,
  RawEvent,
  Progress,
} from "./client";
import { Response, Attendance, Event, EventError } from "./event";

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
      console.error(data.error_description);
      // @ts-ignore
      throw new Error("Failed to refresh token", { cause: data });
    }
    this.credentials = data;

    await this.updateCredentials(this.credentials);
  }
}

export class OutlookClient extends CalendarClient {
  private client: Client;
  private seriesMasters: { [id: string]: OutlookEvent } = {};

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

  private transformEvent(
    outlookEvent: OutlookEvent,
    ownerEmail?: string
  ): Event {
    const start = fromMsDate(outlookEvent.start);
    if (!start) {
      throw new Error("Missing start");
    }
    const end = fromMsDate(outlookEvent.end);
    if (!end) {
      throw new Error("Missing end");
    }

    const organizerEmail =
      outlookEvent.organizer?.emailAddress?.address?.toLowerCase();
    let organizerFound = false;
    const attendance =
      outlookEvent.attendees?.reduce?.((ret, attendee) => {
        const email = attendee.emailAddress?.address?.toLowerCase();
        if (!email) return ret;
        const isOrganizer = email === organizerEmail;
        if (isOrganizer) organizerFound = true;
        const response = this.transformResponse(attendee.status?.response);
        return [
          ...ret,
          {
            email,
            name: attendee.emailAddress?.name,
            response,
            isSelf: email === ownerEmail,
            isOrganizer,
          } as Attendance,
        ];
      }, [] as Attendance[]) || [];
    if (!organizerFound && organizerEmail) {
      attendance.push({
        email: organizerEmail,
        name: outlookEvent.organizer?.emailAddress?.name || undefined,
        response: "accepted" as Response,
        isOrganizer: true,
        isSelf: organizerEmail === ownerEmail,
      });
    }
    const event = new Event({
      id: outlookEvent.id as string,
      series: outlookEvent.seriesMasterId || undefined,
      start,
      end,
      title: outlookEvent.subject || undefined,
      description: outlookEvent.bodyPreview || undefined,
      location: outlookEvent.location?.displayName || undefined,
      isOnline: outlookEvent.isOnlineMeeting || undefined,
      isOnsite: outlookEvent.location?.locationType === "conferenceRoom",
      isCancelled: outlookEvent.isCancelled || undefined,
      isPrivate: outlookEvent.sensitivity
        ? outlookEvent.sensitivity !== "normal"
        : false,
      notMeeting:
        outlookEvent.isCancelled ||
        (outlookEvent.showAs
          ? ["free", "oof", "workingElsewhere"].includes(outlookEvent.showAs)
          : false),
      attendance,
    });
    return event;
  }

  public async *getEvents(
    _calendarId: string,
    min: Date,
    max: Date,
    state: any
  ): AsyncIterableIterator<{
    rawEvent: RawEvent;
    progress: Progress;
    state: any;
  }> {
    const calendar = await this.client.api("/me/calendar").get();

    const total = await this.client
      .api(
        state?.deltaLink ||
          `/me/calendarview/$count?startDateTime=${min.toISOString()}&endDateTime=${max.toISOString()}`
      )
      .get();
    let count = 0;
    const response = await this.client
      .api(
        state?.deltaLink ||
          `/me/calendarview/delta?startDateTime=${min.toISOString()}&endDateTime=${max.toISOString()}`
      )
      .get();
    const ownerEmail = calendar.owner?.address?.toLowerCase();

    let outlookEvent: OutlookEvent | undefined;
    const callback = (nextEvent: OutlookEvent) => {
      outlookEvent = nextEvent;
      return false;
    };

    let pageIterator = new PageIterator(this.client, response, callback);
    await pageIterator.iterate();
    while (outlookEvent) {
      count += 1;
      if (!outlookEvent.id) {
        // ignore
      } else if (outlookEvent.type === "seriesMaster") {
        this.seriesMasters[outlookEvent.id] = outlookEvent;
      } else {
        if (outlookEvent.seriesMasterId) {
          if (this.seriesMasters[outlookEvent.seriesMasterId]) {
            outlookEvent = {
              ...this.seriesMasters[outlookEvent.seriesMasterId],
              ...outlookEvent,
            };
          } else {
            console.error(
              `Missing series master ${outlookEvent.seriesMasterId}`
            );
          }
        }
        const rawEvent = {
          provider: "azure",
          metadata: {
            ownerEmail,
          },
          data: outlookEvent,
        };
        const deltaLink = pageIterator.getDeltaLink();
        state = {
          ...(state || {}),
          deltaLink,
        };
        yield { rawEvent, progress: { count, total }, state };
      }
      if (pageIterator.isComplete()) break;
      outlookEvent = undefined;
      await pageIterator.resume();
    }
  }

  public transform(rawEvent: RawEvent): Event {
    try {
      return this.transformEvent(rawEvent.data, rawEvent.metadata?.ownerEmail);
    } catch (caught) {
      throw new EventError("Event transformation failed", rawEvent, caught);
    }
  }
}
