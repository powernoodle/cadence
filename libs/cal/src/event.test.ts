import { expect, test } from "@jest/globals";
import { toDate } from "date-fns-tz";

import { Event } from "./event";

const tz = { timeZone: "America/New_York" };

test("Single day events not split", async () => {
  const early = [
    toDate("2023-06-23T08:30:00", tz),
    toDate("2023-06-23T09:00:00", tz),
  ];
  const earlyDays = Event.SplitDays(early[0], early[1]);
  expect(earlyDays.length).toBe(1);
  expect(earlyDays[0].start.getTime()).toBe(early[0].getTime());
  expect(earlyDays[0].end.getTime()).toBe(early[1].getTime());
});

test("Events ending at midnight not split", async () => {
  const late = [
    toDate("2023-06-23T23:30:00", tz),
    toDate("2023-06-24T00:00:00", tz),
  ];
  const lateDays = Event.SplitDays(late[0], late[1]);
  expect(lateDays.length).toBe(1);
  expect(lateDays[0].start.getTime()).toBe(late[0].getTime());
  expect(lateDays[0].end.getTime()).toBe(late[1].getTime());
});

test("Full day events not split", async () => {
  const allDay = [
    toDate("2023-06-23T00:00:00", tz),
    toDate("2023-06-24T00:00:00", tz),
  ];
  const days = Event.SplitDays(allDay[0], allDay[1]);
  expect(days.length).toBe(1);
  expect(days[0].start.getTime()).toBe(allDay[0].getTime());
  expect(days[0].end.getTime()).toBe(allDay[1].getTime());
});
