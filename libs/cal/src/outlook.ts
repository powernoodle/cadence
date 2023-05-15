import "isomorphic-fetch";

import axios from "axios";
import qs from "querystring";

import addSeconds from "date-fns/addSeconds";
import addMinutes from "date-fns/addMinutes";
import isAfter from "date-fns/isAfter";
import differenceInMinutes from "date-fns/differenceInMinutes";

import {
  Client,
  AuthenticationProvider,
  PageIterator,
} from "@microsoft/microsoft-graph-client";
import * as MicrosoftGraph from "@microsoft/microsoft-graph-types";

import { Provider, Meeting, MeetingSeries, SaveMeeting } from "./types";

const WEBHOOK_URI = `https://${functions.config().host?.api_domain}/events`;
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const ME_URL = "https://graph.microsoft.com/v1.0/me";
const REDIRECT_URI = process.env.FUNCTIONS_EMULATOR
  ? "http://localhost:3000/plots/"
  : functions.config().ms?.redirect_uri;
const CALENDAR_ID = "primary";
const MAX_WATCH_MINUTES = 4230;

function nextExpiration() {
  return addMinutes(new Date(), MAX_WATCH_MINUTES - 10).toISOString();
}

type MsEvent = MicrosoftGraph.Event;

function fromMsDate(date?: MicrosoftGraph.DateTimeTimeZone) {
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

function eventToMeeting(event: MsEvent): Meeting | null {
  const start = fromMsDate(event.start);
  const end = fromMsDate(event.end);
  if (event.isCancelled || !start || !end) {
    return null;
  }
  return {
    start,
    end,
    length: differenceInMinutes(end, start),
    responses:
      event.attendees?.reduce?.((ret, attendee) => {
        const email = attendee.emailAddress?.address;
        const response = attendee.status?.response;
        if (email && response) {
          ret[email] = response;
        }
        return ret;
      }, {} as { [email: string]: string }) || null,
    description: event.bodyPreview || null, // TODO add HTML body
    location: event.location?.displayName || null,
  };
}

function eventsToMeetingSeries(event: MsEvent): MeetingSeries {
  const cancelled = event.isCancelled;
  return {
    id: event.id as string,
    seriesId: event.seriesMasterId || (event.id as string),
    title: event.subject || "",
    event,
    instances: cancelled ? [] : [eventToMeeting(event) as Meeting],
    attendees:
      event.attendees?.reduce?.((ret, attendee) => {
        const email = attendee.emailAddress?.address;
        let name = attendee.emailAddress?.name;
        if (name === email) name = undefined;
        if (email) {
          ret[email] = name || null;
        }
        return ret;
      }, {} as { [email: string]: string | null }) || {},
  };
}

type Sync = {
  deltaLink?: string;
  subscriptionId?: string;
  expirationDateTime?: Date;
};

class MsAuth implements AuthenticationProvider {
  constructor(
    private uid: string,
    private account: string,
    private creds: any
  ) {}

  /**
   * This method will get called before every request to the msgraph server
   * This should return a Promise that resolves to an accessToken (in case of success) or rejects with error (in case of failure)
   * Basically this method will contain the implementation for getting and refreshing accessTokens
   */
  public async getAccessToken(): Promise<string> {
    if (isAfter(this.creds.expires_at, new Date())) {
      this.creds = await this.refreshTokens(this.uid, this.account, this.creds);
    }
    return this.creds.access_token;
  }

  private async refreshTokens(uid: string, account: string, creds: any) {
    const payload = {
      client_id: functions.config().ms.client_id,
      client_secret: functions.config().ms.client_secret,
      refresh_token: creds.refresh_token,
      redirect_uri: REDIRECT_URI,
      grant_type: "refresh_token",
      scope: creds.scope,
    };
    const tokenResponse = await axios.post(TOKEN_URL, qs.stringify(payload), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const newCreds = {
      ...creds,
      ...tokenResponse.data,
    };
    await updateCredentials(uid, account, "ms", newCreds);
    return newCreds;
  }
}

class MsSync implements Provider {
  private calendarId: string;
  private sync?: Sync;
  private client: Client;

  constructor(
    public uid: string,
    public account: string,
    creds: any,
    sync: { [calendar: string]: object }
  ) {
    this.calendarId = CALENDAR_ID;
    this.sync = sync[this.calendarId] as Sync;
    const authProvider = new MsAuth(uid, account, creds);
    const options = {
      authProvider,
    };
    this.client = Client.initWithMiddleware(options);
  }

  // Returns an array:
  // 0: array of items from the callback
  // 1: the deltaLink
  private async iterate<T>(
    response,
    callback: (item: any) => Promise<T>,
    concurrent = 10
  ) {
    let ret = [] as T[];
    let promises = [] as Promise<T>[];
    let pageIterator = new PageIterator(this.client, response, (x) => {
      promises.push(callback(x));
      return promises.length < concurrent;
    });
    await pageIterator.iterate();
    while (true) {
      ret = ret.concat(await Promise.all(promises));
      promises = [];
      if (pageIterator.isComplete()) {
        break;
      }
      await pageIterator.resume();
    }
    return [ret, pageIterator.getDeltaLink()];
  }

  public async syncEvents(
    timeMin: Date,
    timeMax: Date,
    reset: boolean,
    saveMeeting: SaveMeeting
  ): Promise<any> {
    const meetings = {} as { [id: string]: MeetingSeries };
    const processEvent = (event: MsEvent) => {
      if (!event.id) return;
      let meeting;
      if (event.seriesMasterId) {
        meeting = meetings[event.seriesMasterId];
        if (!meeting) {
          throw new Error(`Couldn't find ${event.seriesMasterId}`);
        }
        if (!meeting.event.__seriesInstances) {
          meeting.event.__seriesInstances = {};
        }
        meeting.event.__seriesInstances[event.id] = event;
      } else {
        meeting = eventsToMeetingSeries(event);
        meetings[meeting.id] = meeting;
      }
    };

    const saveMeetings = async () => {
      await Promise.all(
        Object.keys(meetings).map(async (id) => {
          const meeting = meetings[id];
          const event = meeting.event as MsEvent;
          const instances: MsEvent[] | undefined = (event as any)
            .__seriesInstances;
          meeting.instances = (instances ? Object.values(instances) : [event])
            .map(eventToMeeting)
            .filter((m) => m !== null) as Meeting[];
          const fullUpdate = !reset && meeting.instances.length !== 1;
          const plot = await saveMeeting(
            meeting,
            !fullUpdate,
            !!event.recurrence
          );
          if (fullUpdate && plot) {
            await updatePlotFromMeetings(plot, {
              account: this.account,
              calendar: this.calendarId,
              synced: new Date(),
              update: null,
            });
          }
        })
      );
    };

    let deltaLink;
    try {
      const response = await this.client
        .api(
          !reset && this.sync?.deltaLink
            ? this.sync?.deltaLink
            : `/me/calendarview/delta?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}`
        )
        .get();

      [, deltaLink] = await this.iterate(response, async (event: MsEvent) => {
        try {
          processEvent(event);
        } catch (error) {
          console.error(`Failed to process ${this.uid} event ${event.id}`);
          console.log(event);
          console.error(error);
        }
      });
    } catch (error) {
      console.error(error);
    }

    await saveMeetings();

    if (!deltaLink) {
      throw new Error("Missing syncToken");
    }

    this.sync = {
      ...this.sync,
      deltaLink,
    };
    return this.sync;
  }

  public async startWatch() {
    if (!this.sync?.deltaLink) {
      throw new Error("Missing deltaLink");
    }

    const response = await this.client.api("/subscriptions").post({
      changeType: "created,updated,deleted",
      notificationUrl: WEBHOOK_URI,
      resource: `me/events`,
      expirationDateTime: nextExpiration(),
      clientState: `${this.uid}/${this.account}/${this.calendarId}`,
    });
    return {
      ...this.sync,
      subscriptionId: response.id,
      expiration: new Date(response.expirationDateTime),
    };
  }

  public async checkWatch(context: any) {
    if (!context?.subscriptionId) {
      return false;
    }
    if (this.sync?.subscriptionId === context.subscriptionId) {
      return true;
    }
    await this.stopWatch(context.subscriptionId);
    return false;
  }

  public async stopWatch(id?: string) {
    if (!id) {
      id = this.sync?.subscriptionId;
    }
    if (!id) return;
    await this.client.api(`/subscriptions/${id}`).delete();
  }

  public async renewWatch() {
    if (!this.sync?.subscriptionId) {
      throw new Error("Can't renew without a subscriptionId");
    }
    try {
      const response = await this.client
        .api(`/subscriptions/${this.sync.subscriptionId}`)
        .patch({
          expirationDateTime: nextExpiration(),
        });
      return {
        ...this.sync,
        expiration: new Date(response.expirationDateTime),
      };
    } catch (error) {
      console.error(error);
      return await this.startWatch();
    }
  }
}

export async function getCredentials(uid: string, data: any): Promise<any> {
  const payload = {
    client_id: functions.config().ms.client_id,
    client_secret: functions.config().ms.client_secret,
    code: data.credentials,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
    scope: "openid email user.read calendars.read offline_access",
  };
  const tokenResponse = await axios.post(TOKEN_URL, qs.stringify(payload), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const credentials = tokenResponse.data;
  credentials.expires_at = addSeconds(new Date(), credentials.expires_in - 60);

  const meResponse = await axios.get(ME_URL, {
    headers: {
      Authorization: `Bearer ${credentials.access_token}`,
    },
  });

  return {
    account: `ms:${meResponse.data.userPrincipalName}`,
    credentials,
  };
}

export async function getClient(
  uid: string,
  account: string,
  creds: any,
  sync: { [calendar: string]: object }
): Promise<Provider> {
  return new MsSync(uid, account, creds, sync);
}
