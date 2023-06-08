import _endOfDay from "date-fns/endOfDay";
import _endOfMonth from "date-fns/endOfMonth";
import _endOfWeek from "date-fns/endOfWeek";
import _formatDate from "date-fns/format";
import _startOfDay from "date-fns/startOfDay";
import _startOfMonth from "date-fns/startOfMonth";
import _startOfWeek from "date-fns/startOfWeek";
import _isSameDay from "date-fns/isSameDay";
import {
  zonedTimeToUtc,
  utcToZonedTime,
  toDate as _toDate,
  formatInTimeZone,
} from "date-fns-tz";

function zoned<T>(
  date: Date,
  tz: string,
  fn: (date: Date, options?: T) => Date,
  options?: T
): Date {
  const inputZoned = utcToZonedTime(date, tz);
  const fnZoned = options ? fn(inputZoned, options) : fn(inputZoned);
  return zonedTimeToUtc(fnZoned, tz);
}

function zoned2<T>(
  d1: Date,
  d2: Date,
  tz: string,
  fn: (d1: Date, d2: Date) => T
): T {
  const d1z = utcToZonedTime(d1, tz);
  const d2z = utcToZonedTime(d2, tz);
  return fn(d1z, d2z);
}

export const toDate = (date: string, tz: string) => {
  return _toDate(date, { timeZone: tz });
};

export function formatDate(date: Date, tz: string, format: string) {
  return formatInTimeZone(date, tz, format);
}

export const toTz = (date: Date, tz: string) => {
  return zonedTimeToUtc(date, tz);
};

export const fromTz = (date: Date, tz: string) => {
  return utcToZonedTime(date, tz);
};

export function startOfDay(date: Date, tz: string) {
  return zoned(date, tz, _startOfDay);
}
export function endOfDay(date: Date, tz: string) {
  return zoned(date, tz, _endOfDay);
}

export function startOfMonth(date: Date, tz: string) {
  return zoned(date, tz, _startOfMonth);
}
export function endOfMonth(date: Date, tz: string) {
  return zoned(date, tz, _endOfMonth);
}

export function startOfWeek(
  date: Date,
  tz: string,
  options?: Parameters<typeof _startOfWeek>[1]
) {
  return zoned(date, tz, _startOfWeek, options);
}
export function endOfWeek(
  date: Date,
  tz: string,
  options?: Parameters<typeof _endOfWeek>[1]
) {
  return zoned(date, tz, _endOfWeek, options);
}

export function isSameDay(d1: Date, d2: Date, tz: string) {
  return zoned2(d1, d2, tz, _isSameDay);
}
