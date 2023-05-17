import { Event } from "./event";

export type Credentials = {
  access_token: string;
  refresh_token: string;
};

export type UpdateCredentials = (credentials: Credentials) => Promise<void>;

export abstract class CalendarClient {
  public abstract getEvents(
    calendarId: string,
    min: Date,
    max: Date,
    state: any
  ): AsyncIterableIterator<{ event: Event; state: any }>;
}
