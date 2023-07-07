import {
  Button,
  Flex,
  Group,
  SimpleGrid,
  Title,
  useMantineColorScheme,
} from "@mantine/core";

/** @jsxfrag */
import type { ActionArgs, LoaderArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  IconCalendarCheck,
  IconCalendarQuestion,
  IconCalendarX,
} from "@tabler/icons-react";
import { useState } from "react";

import type { Database } from "@divvy/db";

import { makeColor } from "../color";
import { DateRangeSelect, getDateRange } from "../components/date-range";
import { TargetGauge } from "../components/gauge";
import { USER_TZ } from "../config";
import { createServerClient, getAccountId, safeQuery } from "../util";

type EventType = Database["public"]["Enums"]["event_type"] | "meeting";
type EventStatus = Database["public"]["Enums"]["event_status"];

type TypeStats = {
  [key in EventStatus]?: {
    minutes: number;
    count: number;
  };
};
type EventStats = {
  [key in EventType]?: TypeStats;
};

async function getStats(
  supabase: SupabaseClient<Database>,
  accountId: number,
  during: string
): Promise<EventStats> {
  const focusData = safeQuery(
    await supabase.rpc("day_stats", {
      _account_id: accountId,
      during,
    })
  );
  const data = focusData?.reduce(
    (acc, { type, status, weekly_minutes, total_count }) => {
      acc[type] = {
        ...acc[type],
        [status]: {
          minutes: weekly_minutes,
          count: total_count,
        },
      };
      if (type !== "personal" && type !== "focus") {
        acc["meeting"] = {
          ...acc["meeting"],
          [status]: {
            minutes: (acc["meeting"]?.[status]?.minutes || 0) + weekly_minutes,
            count: (acc["meeting"]?.[status]?.count || 0) + total_count,
          },
        };
      }
      return acc;
    },
    {} as EventStats
  );
  return data || {};
}

export async function action({ context, request }: ActionArgs) {
  const { supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);
  const bodyParams = await request.formData();
  if (typeof bodyParams.get("targets") === "string") {
    const targets = JSON.parse(bodyParams.get("targets") as string);
    for (const [eventType, minutes] of Object.entries(targets)) {
      safeQuery(
        await supabase
          .from("target")
          .upsert({ account_id: accountId, event_type: eventType, minutes })
      );
    }
  }
  return json({});
}

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const { current, previous } = getDateRange(
    new URL(request.url).searchParams,
    USER_TZ
  );
  const during = `[${current.start}, ${current.end})`;
  const previousDuring = `[${previous.start}, ${previous.end})`;

  const data = await getStats(supabase, accountId, during);
  const previousData = await getStats(supabase, accountId, previousDuring);

  const targets =
    safeQuery(
      await supabase.from("target").select().eq("account_id", accountId)
    )?.reduce((acc, { event_type, minutes }) => {
      acc[event_type] = minutes;
      return acc;
    }, {} as Record<EventType, number>) || ({} as Record<EventType, number>);

  return json(
    {
      data,
      previousData,
      targets,
      accountId,
    },
    { headers: response.headers }
  );
};

function trend(data: TypeStats, previousData: TypeStats) {
  return (
    (((data?.attended?.minutes || 0) +
      (data?.scheduled?.minutes || 0) +
      (data?.pending?.minutes || 0)) /
      ((previousData?.attended?.minutes || 0) +
        (previousData?.scheduled?.minutes || 0) +
        (previousData?.pending?.minutes || 0))) *
      100 -
    100
  );
}

// {
//   icon: <IconCalendarCheck />,
//   color: makeColor("gray", 8, 1, colorScheme),
//   label: `${data.scheduled?.count || 0} scheduled`,
// },
// ...(data.pending
//   ? [
//       {
//         icon: <IconCalendarQuestion />,
//         color: makeColor("yellow", 9, 2, colorScheme),
//         label: `${data.pending.count || 0} pending`,
//       },
//     ]
//   : []),
// ...(data.declined
//   ? [
//       {
//         icon: <IconCalendarX />,
//         color: makeColor("gray", 6, 5, colorScheme),
//         label: `${data.declined.count || 0} declined`,
//       },
//     ]
//   : []),
// {
//   icon: <IconCalendarCheck />,
//   color: makeColor("gray", 6, 5, colorScheme),
//   label: `${data.attended?.count || 0} attended`,
// },

function Target({
  title,
  data,
  previousData,
  targetMinutes,
  color,
  maximize,
  onTargetChange,
}: {
  title: string;
  data: TypeStats;
  previousData: TypeStats;
  targetMinutes?: number;
  color: string;
  maximize?: boolean;
  onTargetChange?: (minutes: number) => void;
}) {
  return (
    <TargetGauge
      title={title}
      pastMinutes={data?.attended?.minutes || 0}
      scheduledMinutes={data?.scheduled?.minutes || 0}
      pendingMinutes={data?.pending?.minutes || 0}
      targetMinutes={targetMinutes}
      onChange={onTargetChange}
      totalMinutes={40 * 60}
      color={color}
      trend={trend(data, previousData)}
      maximize={maximize}
    />
  );
}

export const handle = {
  headerControl: () => <DateRangeSelect />,
};

export default function MeetingLoad() {
  const {
    data,
    previousData,
    targets: loaderTargets,
  } = useLoaderData<typeof loader>();
  const [targets, setTargets] = useState(loaderTargets);
  const fetcher = useFetcher();

  if (!data || !previousData) return null;

  const updateTarget = (type: EventType, target: number) => {
    setTargets({ ...targets, [type]: target });
    fetcher.submit(
      {
        targets: JSON.stringify({
          [type]: target,
        }),
      },
      { method: "post" }
    );
  };

  return (
    <SimpleGrid cols={1} breakpoints={[{ minWidth: "94rem", cols: 2 }]}>
      <Target
        title={"Meeting Load"}
        data={data.meeting || {}}
        previousData={previousData.meeting || {}}
        targetMinutes={targets?.meeting}
        onTargetChange={(target) => updateTarget("meeting", target)}
        color="orange"
      />

      <Target
        title={"Focus Blocks"}
        data={data.focus || {}}
        previousData={previousData.focus || {}}
        targetMinutes={targets?.focus}
        onTargetChange={(target) => updateTarget("focus", target)}
        maximize={true}
        color="violet"
      />
    </SimpleGrid>
  );
}
