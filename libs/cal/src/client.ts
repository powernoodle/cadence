// foo
import { Event } from "./event";

export type Credentials = {
  access_token: string;
  refresh_token: string;
};

export type UpdateCredentials = (credentials: Credentials) => Promise<void>;

export type Progress = {
  count: number;
  total: number;
};

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
    progress: Progress;
    state: any;
  }>;

  public abstract transform(rawEvent: RawEvent): Event[];
}
