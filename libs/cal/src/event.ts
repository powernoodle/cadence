export type Response = "accepted" | "declined" | "tentative" | null;

export type Attendance = {
  email: string;
  name?: string;
  response: Response;
  isOrganizer?: boolean;
};

export class Event {
  private static HasConferencing(
    location?: string | null,
    description?: string | null
  ): boolean {
    const both = (location || "") + (description || "");
    return !!both.match(
      /(((zoom\.us)|(meet\.google\.com))\/)|(teams\.microsoft\.com\/meetup-join)/
    );
  }

  public raw?: object;
  public isOnline: boolean = false;
  public isOnsite: boolean = false;
  public isOffsite: boolean = false;
  public attendance: Attendance[] = [];

  constructor(
    public uid: string,
    public recurrenceId: string | null,
    public start: Date,
    public end: Date,
    public title: string | null = null,
    description: string | null = null,
    location: string | null = null
  ) {
    this.isOnline = Event.HasConferencing(location, description);
  }

  public get numAttendees(): number {
    return this.attendance.length;
  }

  public get length(): number {
    return (this.end.getTime() - this.start.getTime()) / 1000 / 60;
  }

  public get isMeeting(): boolean {
    return this.numAttendees > 1 || this.isOnline;
  }
}
