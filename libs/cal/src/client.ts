import { Event } from "./event";

export type UpdateCredentials = (credentials: any) => Promise<void>;

export abstract class CalendarClient {
  public constructor(
    public credentials: any,
    protected updateCredentials: UpdateCredentials
  ) {}

  public abstract getEvents(
    calendarId: string,
    min: Date,
    max: Date,
    state: any
  ): AsyncIterableIterator<{ event: Event; state: any }>;
}
