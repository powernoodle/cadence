export type Response = "accepted" | "declined" | "tentative" | null;

export type Attendance = {
  email: string;
  name?: string;
  response: Response;
  isOrganizer?: boolean;
  isSelf?: boolean;
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

  public readonly id: string;
  public readonly series?: string;
  public readonly start: Date;
  public readonly end: Date;
  public readonly isCancelled: boolean = false;
  public readonly isPrivate: boolean = false;
  public readonly isOnline: boolean = false;
  public readonly isOnsite: boolean = false;
  public readonly isOffsite: boolean = false;
  public readonly attendance: Attendance[] = [];

  public readonly raw?: { [key: string]: any };

  private _title?: string;
  private _isMeeting: boolean = true;

  constructor(args: {
    id: string;
    start: Date;
    end: Date;
    series?: string;
    title?: string;
    description?: string;
    location?: string;
    isCancelled?: boolean;
    isPrivate?: boolean;
    isOnline?: boolean;
    isOnsite?: boolean;
    isOffsite?: boolean;
    notMeeting?: boolean;
    raw?: { [key: string]: any };
    attendance?: Attendance[];
  }) {
    this.id = args.id;
    this.start = args.start;
    this.end = args.end;
    this.series = args.series;
    this._title = args.title;
    this.raw = args.raw;
    this.isCancelled = !!args.isCancelled;
    this.isPrivate = !!args.isPrivate;
    this.isOnline =
      args.isOnline || Event.HasConferencing(args.location, args.description);
    this.isOnsite = !!args.isOnsite;
    this.isOffsite =
      !this.isOffsite || (!this.isOnline && !this.isOnsite && !!location);

    if (args.attendance) {
      this.attendance = args.attendance;
    }

    if (args.notMeeting || (this.numAttendees <= 1 && !this.isOnline)) {
      this._isMeeting = false;
    }
  }

  public get title(): string {
    if (this._title && !this.isPrivate) {
      return this._title;
    }
    let title;
    if (this.isPrivate) {
      title = "Private meeting";
    } else {
      title = "Untitled meeting";
    }
    if (this.numAttendees > 1) {
      const names = this.attendance
        .filter((a) => !a.isSelf)
        .map((a) => a.name || a.email);
      switch (names.length) {
        case 0:
          break;
        case 1:
          title += ` with ${names[0]}`;
          break;
        case 2:
          title += ` with ${names[0]} and ${names[1]}`;
          break;
        default:
          title += ` with ${names.slice(0, 2).join(", ")}, and ${
            names.length - 2
          } other${names.length - 2 > 1 ? "s" : ""}`;
          break;
      }
    }
    return title;
  }

  public get numAttendees(): number {
    return this.attendance.length;
  }

  public get length(): number {
    let minutes = (this.end.getTime() - this.start.getTime()) / 1000 / 60;
    if (minutes > 8 * 60) {
      const fullDays = Math.floor(minutes / (24 * 60));
      const remainder = minutes - fullDays * 24 * 60;
      minutes = fullDays * 8 * 60;
      if (remainder <= 8 * 60) {
        minutes += remainder;
      } else {
        minutes += 8 * 60;
      }
    }
    return minutes;
  }

  public get isMeeting(): boolean {
    return this._isMeeting && !this.isCancelled;
  }

  public get isCancelledMeeting(): boolean {
    return this._isMeeting && this.isCancelled;
  }
}
