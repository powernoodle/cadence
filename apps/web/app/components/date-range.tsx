import { useState, useEffect } from "react";

import { useSearchParams } from "@remix-run/react";
import { Group, Button, Select } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import add from "date-fns/add";
import {
  toDate,
  endOfMonth,
  endOfWeek,
  formatDate,
  formatWeek,
  startOfMonth,
  startOfWeek,
} from "@divvy/tz";

import { USER_TZ } from "../config";

type Timeframe = "week" | "month";
type DateRange = {
  start: string;
  end: string;
};

function formatDay(d: Date, tz: string) {
  return formatDate(d, tz, "yyyy-MM-dd");
}

function makeDateRange(
  start: Date,
  timeframe: Timeframe,
  tz: string
): DateRange {
  switch (timeframe) {
    case "week":
      return {
        start: formatDay(startOfWeek(start, tz), tz),
        end: formatDay(endOfWeek(start, tz), tz),
      };
    case "month":
      return {
        start: formatDay(startOfMonth(start, tz), tz),
        end: formatDay(endOfMonth(start, tz), tz),
      };
  }
}

function getDefaultDateRange(timeframe: Timeframe, tz: string) {
  return makeDateRange(new Date(), timeframe, tz);
}

function getEnd(start: string, timeframe: Timeframe, tz: string) {
  const date = toDate(start, tz);
  switch (timeframe) {
    case "week":
      return formatDay(endOfWeek(date, tz), tz);
    case "month":
      return formatDay(endOfMonth(date, tz), tz);
  }
}

function moveDateRange(
  range: DateRange,
  timeframe: Timeframe,
  movement: number,
  tz: string
) {
  const start = moveStart(range.start, timeframe, movement, tz);
  const end = getEnd(start, timeframe, tz);
  return {
    start,
    end,
  };
}

function moveStart(
  start: string,
  timeframe: Timeframe,
  movement: number,
  tz: string
) {
  const newStart = add(
    toDate(start, tz),
    timeframe === "week" ? { days: movement * 7 } : { months: movement }
  );
  return formatDay(newStart, tz);
}

function toTimeframe(timeframe: string | null) {
  switch (timeframe) {
    case "week":
    case "month":
      return timeframe as Timeframe;
    default:
      return "week";
  }
}

export const getDateRange = (params: URLSearchParams, tz: string) => {
  const timeframe: Timeframe = toTimeframe(params.get("timeframe"));
  let start = params.get("start");
  let end;
  if (start) {
    end = getEnd(start, timeframe, tz);
  } else {
    ({ start, end } = getDefaultDateRange(timeframe, tz));
  }
  const current = {
    start,
    end,
  };
  return {
    current,
    previous: moveDateRange(current, timeframe, -1, tz),
    next: moveDateRange(current, timeframe, 1, tz),
  };
};

function formatDateRange(start: string, timeframe: Timeframe, tz: string) {
  switch (timeframe) {
    case "week":
      return formatWeek(toDate(start, tz), tz);
    case "month":
      return `${formatDate(toDate(start, tz), tz, "MMMM")}`;
  }
}

export function DateRangeSelect() {
  const [searchParams, setSearchParams] = useSearchParams();

  const timeframeParam = toTimeframe(searchParams.get("timeframe"));
  const [timeframe, setTimeframe] = useState(timeframeParam);
  useEffect(() => {
    setTimeframe(timeframeParam);
  }, [timeframeParam]);

  const defaultStart = getDefaultDateRange(timeframe, USER_TZ).start;
  const start = searchParams.get("start") || defaultStart;
  const timeframes = [
    ...(start !== defaultStart
      ? [
          {
            label: formatDateRange(start, timeframe, USER_TZ),
            value: "current",
            selected: true,
          },
        ]
      : []),
    {
      label: formatDateRange(defaultStart, "week", USER_TZ),
      value: "week",
      selected: start === defaultStart && timeframe === "week",
    },
    {
      label: formatDateRange(defaultStart, "month", USER_TZ),
      value: "month",
      selected: start === defaultStart && timeframe === "month",
    },
  ];
  const onTimeframeChange = (newTimeframe: string) => {
    if (newTimeframe === "current") return;
    setSearchParams((p) => {
      const { start, timeframe, ...other } = Object.fromEntries(p.entries());
      if (newTimeframe === "week") return other;
      return {
        ...other,
        timeframe: newTimeframe,
      };
    });
  };

  const move = (movement: number) => {
    const newStart = moveStart(start, timeframe, movement, USER_TZ);
    setSearchParams((p) => {
      const { start, ...other } = Object.fromEntries(p.entries());
      if (newStart === defaultStart) return other;
      return {
        ...other,
        start: newStart,
      };
    });
  };

  return (
    <Group spacing="xs">
      <Button variant="subtle" p={0} onClick={() => move(-1)}>
        <IconChevronLeft />
      </Button>
      <Select
        value={start === defaultStart ? timeframe : "current"}
        onChange={onTimeframeChange}
        data={timeframes}
        variant="unstyled"
        w="13em"
        styles={{
          input: {
            textAlign: "center",
          },
        }}
      />
      <Button variant="subtle" p={0} onClick={() => move(+1)}>
        <IconChevronRight />
      </Button>
    </Group>
  );
}
