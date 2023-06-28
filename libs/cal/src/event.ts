import { add } from "date-fns";
import { eachDayOfInterval, startOfDay } from "@divvy/tz";

const USER_TZ = "America/New_York";

export type Response = "accepted" | "declined" | "tentative" | null;
export type EventType =
  | "internal"
  | "external"
  | "growth"
  | "focus"
  | "personal"
  | null;

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

  public static SplitDays(start: Date, end: Date) {
    if ((end.getTime() - start.getTime()) / 1000 / 60 / 60 <= 24) {
      return [{ start, end }];
    }
    const openEnd = new Date(end.getTime() - 1);
    const days = eachDayOfInterval({ start, end: openEnd }, USER_TZ);
    return days.map((d, i) => {
      let dayStart = i === 0 ? start : startOfDay(d, USER_TZ);
      let dayEnd =
        i === days.length - 1 ? end : startOfDay(add(d, { days: 1 }), USER_TZ);
      return { start: dayStart, end: dayEnd };
    });
  }

  public readonly id: string;
  public readonly series: string;
  public readonly start: Date;
  public readonly end: Date;
  public readonly isCancelled: boolean = false;
  public readonly isPrivate: boolean = false;
  public readonly isOnline: boolean = false;
  public readonly isOnsite: boolean = false;
  public readonly isOffsite: boolean = false;
  public readonly attendance: Attendance[] = [];

  private _title?: string;
  private _accountEmail: string;

  constructor(args: {
    id: string;
    start: Date;
    end: Date;
    accountEmail: string;
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
    attendance?: Attendance[];
  }) {
    this.id = args.id;
    this._accountEmail = args.accountEmail;
    this.start = args.start;
    this.end = args.end;
    this.series = args.series || args.id;
    this._title = args.title;
    this.isCancelled = !!args.isCancelled;
    this.isPrivate = !!args.isPrivate;
    this.isOnline =
      args.isOnline || Event.HasConferencing(args.location, args.description);
    this.isOnsite = !!args.isOnsite;
    this.isOffsite =
      !this.isOffsite || (!this.isOnline && !this.isOnsite && !!args.location);

    if (args.attendance) {
      const emails = new Set<string>();
      this.attendance = [];
      for (const a of args.attendance) {
        if (!emails.has(a.email)) {
          this.attendance.push(a);
          emails.add(a.email);
        }
      }
    }

    if (args.notMeeting || this.numAttendees <= 1 || this.length >= 24 * 60) {
      // Not a meeting
    } else if (
      this._title?.match(
        /coaching|mentor|training|health|volunteer|break|buffer|yoga|massage/i
      )
    ) {
      this.type = "growth";
    } else if (this.hasExternalAttendees()) {
      this.type = "external";
    } else {
      this.type = "internal";
    }
  }

  public hasExternalAttendees(): boolean {
    const [_, internalDomain] = this._accountEmail.split("@");
    return this.attendance.some((a) => {
      const [_, domain] = a.email.split("@");
      return domain !== internalDomain;
    });
  }

  public get title(): string {
    if (this._title && !this.isPrivate) {
      return this._title;
    }
    let title;
    if (this.isPrivate) {
      title = "Private meeting";
    } else {
      title = "Meeting";
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

  public get response(): Response | null {
    return (
      this.attendance.filter((a) => a.email === this._accountEmail)[0]
        ?.response || null
    );
  }

  public get length(): number {
    return (this.end.getTime() - this.start.getTime()) / 1000 / 60;
  }

  public readonly type: EventType = null;
}

export class EventError extends Error {
  constructor(message: string, public event: any, cause?: any) {
    if (cause) {
      if (cause.message) {
        message += `: ${cause.message}`;
      }
      if (cause.detail) {
        message += `\n${cause.detail}`;
      }
      if (cause.where) {
        message += `\n${cause.where}`;
      }
    }
    super(message, { cause });
    this.name = "EventError";
  }
}
