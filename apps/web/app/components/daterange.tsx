import { useState } from "react";

import { useLocation, useSearchParams } from "@remix-run/react";
import { Group, Button, Select } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import add from "date-fns/add";
import differenceInDays from "date-fns/differenceInDays";
import sub from "date-fns/sub";
import {
  toDate,
  endOfDay,
  endOfMonth,
  endOfWeek,
  formatDate,
  formatWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "@divvy/tz";

import { USER_TZ } from "../config";

export const getDateRange = (params: URLSearchParams, timeframe?: string) => {
  const startParam = params.get("start");
  const endParam = params.get("end");
  if (!timeframe) timeframe = params.get("timeframe") || "28d";
  const start = startParam
    ? startOfDay(toDate(startParam, USER_TZ), USER_TZ)
    : startOfDay(new Date(), USER_TZ);
  const end = endParam
    ? endOfDay(toDate(endParam, USER_TZ), USER_TZ)
    : endOfDay(new Date(), USER_TZ);

  switch (timeframe) {
    case "month":
      return [
        [startOfMonth(end, USER_TZ), endOfMonth(end, USER_TZ)],
        [
          startOfMonth(sub(end, { months: 1 }), USER_TZ),
          endOfMonth(sub(end, { months: 1 }), USER_TZ),
        ],
        [
          startOfMonth(add(end, { months: 1 }), USER_TZ),
          endOfMonth(add(end, { months: 1 }), USER_TZ),
        ],
      ];
    case "week":
      return [
        [startOfWeek(end, USER_TZ), endOfWeek(end, USER_TZ)],
        [
          startOfWeek(sub(end, { weeks: 1 }), USER_TZ),
          endOfWeek(sub(end, { weeks: 1 }), USER_TZ),
        ],
        [
          startOfWeek(add(end, { weeks: 1 }), USER_TZ),
          endOfWeek(add(end, { weeks: 1 }), USER_TZ),
        ],
      ];
    case "28d":
      return [
        [startOfDay(sub(end, { days: 27 }), USER_TZ), endOfDay(end, USER_TZ)],
        [
          startOfDay(sub(end, { days: 27 + 28 }), USER_TZ),
          endOfDay(sub(end, { days: 28 }), USER_TZ),
        ],
        [
          startOfDay(add(end, { days: 1 }), USER_TZ),
          endOfDay(add(end, { days: 28 }), USER_TZ),
        ],
      ];
    default:
      return [
        [start, end],
        [
          sub(start, { days: differenceInDays(end, start) + 1 }),
          sub(end, { days: differenceInDays(end, start) }),
        ],
        [
          add(start, { days: differenceInDays(end, start) }),
          add(end, { days: differenceInDays(end, start) + 1 }),
        ],
      ];
  }
};

export function DateRange() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const timeframes = [
    {
      label: formatWeek(new Date(), USER_TZ),
      value: "week",
    },
    {
      label: `${formatDate(new Date(), USER_TZ, "MMMM")}`,
      value: "month",
    },
  ];
  const [timeframe, setTimeframeState] = useState(
    searchParams.get("timeframe") || "week"
  );
  const onTimeframeChange = async (timeframe: string) => {
    if (!timeframe) return;
    setTimeframeState(timeframe);
    const [current] = getDateRange(
      new URLSearchParams(location.search),
      timeframe
    );
    setSearchParams((p) => {
      const { start, end, ...other } = Object.fromEntries(p.entries());
      return {
        ...other,
        timeframe,
        ...(timeframe === "custom"
          ? {
              start: formatDate(current[0], USER_TZ, "yyyy-MM-dd"),
              end: formatDate(current[1], USER_TZ, "yyyy-MM-dd"),
            }
          : {}),
      };
    });
  };

  return (
    <Group spacing="xs">
      <Button variant="subtle">
        <IconChevronLeft />
      </Button>
      <Select
        value={timeframe}
        onChange={onTimeframeChange}
        data={timeframes}
        variant="unstyled"
      />
      <Button variant="subtle">
        <IconChevronRight />
      </Button>
    </Group>
  );
}
