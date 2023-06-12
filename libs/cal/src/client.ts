import { Event } from "./event";

export type Credentials = {
  access_token: string;
  refresh_token: string;
};

export type UpdateCredentials = (credentials: Credentials) => Promise<void>;

export type RawEvent = {
  provider: string;
  data: { [key: string]: any };
  metadata?: { [key: string]: any };
};

export abstract class CalendarClient {
  public abstract getEvents(
    calendarId: string,
    min: Date,
    max: Date,
    state: any
  ): AsyncIterableIterator<{
    rawEvent: RawEvent;
    state: any;
  }>;

  public abstract transform(rawEvent: RawEvent): Event;
}
