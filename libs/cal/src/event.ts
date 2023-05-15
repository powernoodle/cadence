export type Response = "accepted" | "declined" | "tentative" | null;

export type Attendance = {
  email: string;
  name?: string;
  response: Response;
};

export class Event {
  length: number = 30; // minutes
  title: string | null = null;
  location: string | null = null;
  description: string | null = null;
  organizer: string | null = null;
  attendance: Attendance[] = [];
  recurrenceId: string | null = null;

  constructor(public uid: string, public start: Date, public end: Date) {
    length = (end.getTime() - start.getTime()) / 1000 / 60;
  }
}
