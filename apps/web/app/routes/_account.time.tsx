/** @jsxfrag */
import type { LoaderArgs } from "@remix-run/cloudflare";

import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import {
  SimpleGrid,
  Card,
  Title,
  Button,
  Group,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCalendarCheck,
  IconCalendarX,
  IconCalendarQuestion,
} from "@tabler/icons-react";

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@divvy/db";

import {
  getDateRange,
  isPast,
  DateRangeSelect,
} from "../components/date-range";
import { createServerClient, getAccountId, safeQuery } from "../util";
import { ProjectionGuage, TargetGuage } from "../components/guage";
import { makeColor } from "../color";
import { USER_TZ } from "../config";

type EventType = Database["public"]["Enums"]["event_type"];
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
        [status]: {
          minutes: weekly_minutes,
          count: total_count,
        },
      };
      return acc;
    },
    {}
  );
  return data || {};
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

  return json(
    {
      data,
      previousData,
      accountId,
      isPast: isPast(current.end, USER_TZ),
    },
    { headers: response.headers }
  );
};

function StatCard({
  title,
  data,
  previousData,
  targetMinutes,
  color,
  maximize,
  isPast,
}: {
  title: string;
  data: TypeStats;
  previousData: TypeStats;
  targetMinutes?: number;
  color: string;
  maximize?: boolean;
  isPast: boolean;
}) {
  const { colorScheme } = useMantineColorScheme();

  const links = [
    {
      icon: <IconCalendarCheck />,
      color: makeColor("gray", 8, 1, colorScheme),
      label: `${data.scheduled?.count || 0} scheduled`,
    },
    ...(data.pending
      ? [
          {
            icon: <IconCalendarQuestion />,
            color: makeColor("yellow", 9, 2, colorScheme),
            label: `${data.pending.count || 0} pending`,
          },
        ]
      : []),
    ...(data.declined
      ? [
          {
            icon: <IconCalendarX />,
            color: makeColor("gray", 6, 5, colorScheme),
            label: `${data.declined.count || 0} declined`,
          },
        ]
      : []),
    {
      icon: <IconCalendarCheck />,
      color: makeColor("gray", 6, 5, colorScheme),
      label: `${data.attended?.count || 0} attended`,
    },
  ];
  const projectedMinutes =
    (data?.attended?.minutes || 0) +
    (data?.scheduled?.minutes || 0) +
    (data?.pending?.minutes || 0);
  const trend =
    (projectedMinutes /
      ((previousData?.attended?.minutes || 0) +
        (previousData?.scheduled?.minutes || 0) +
        (previousData?.pending?.minutes || 0))) *
      100 -
    100;

  return (
    <Card sx={{ overflow: "visible !important" }}>
      <Title
        order={2}
        size="h4"
        fw={700}
        color={makeColor(color, 6, 4, colorScheme)}
      >
        {title}
      </Title>
      <SimpleGrid cols={1} breakpoints={[{ minWidth: "48rem", cols: 2 }]}>
        <ProjectionGuage
          label={isPast ? "Attended" : "Projected"}
          pastMinutes={data?.attended?.minutes || 0}
          scheduledMinutes={data?.scheduled?.minutes || 0}
          pendingMinutes={data?.pending?.minutes || 0}
          color={color}
          trend={trend}
          maximize={maximize}
        />
        <TargetGuage
          projectedMinutes={projectedMinutes}
          targetMinutes={targetMinutes}
          maximize={maximize}
        />
      </SimpleGrid>
      <Group position="apart">
        {links.map((link: any, i: number) => (
          <Button
            key={i.toString()}
            color={link.color}
            variant="subtle"
            leftIcon={link.icon}
          >
            {link.label}
          </Button>
        ))}
      </Group>
    </Card>
  );
}

export const handle = {
  headerControl: () => <DateRangeSelect />,
};

export default function MeetingLoad() {
  const { data, previousData, isPast } = useLoaderData<typeof loader>();
  if (!data || !previousData) return null;

  return (
    <>
      <Title order={2} size="h2" mb="lg">
        Weekly working hours
      </Title>
      <SimpleGrid
        cols={1}
        breakpoints={[
          { minWidth: "98rem", cols: 2 },
          { minWidth: "138rem", cols: 3 },
          { minWidth: "184rem", cols: 4 },
        ]}
      >
        <StatCard
          title={"Work Meetings"}
          data={data.internal || {}}
          previousData={previousData.internal || {}}
          targetMinutes={10 * 60}
          color="orange"
          isPast={isPast}
        />
        <StatCard
          title={"Customer Meetings"}
          data={data.external || {}}
          previousData={previousData.external || {}}
          targetMinutes={3 * 60}
          maximize={true}
          color="yellow"
          isPast={isPast}
        />
        <StatCard
          title={"Deep Work Blocks"}
          data={data.focus || {}}
          previousData={previousData.focus || {}}
          targetMinutes={22 * 60}
          maximize={true}
          color="blue"
          isPast={isPast}
        />
        <StatCard
          title={"Health, Growth & Giving Activities"}
          data={data.growth || {}}
          previousData={previousData.growth || {}}
          maximize={true}
          color="cyan"
          isPast={isPast}
        />
      </SimpleGrid>
    </>
  );
}
