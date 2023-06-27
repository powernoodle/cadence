/** @jsxfrag */
import type { LoaderArgs } from "@remix-run/cloudflare";

import { useOutletContext, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import {
  SimpleGrid,
  Card,
  Title,
  Button,
  Text,
  Grid,
  Group,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCalendarCheck,
  IconCalendarX,
  IconCalendarExclamation,
  IconCalendarQuestion,
} from "@tabler/icons-react";

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@divvy/db";

import { SupabaseOutletContext } from "../root";
import { DateRange } from "../components/daterange";
import { getDateRange } from "./_account";
import { createServerClient, getAccountId, safeQuery } from "../util";
import { ProjectionGuage, TargetGuage } from "../components/guage";
import { makeColor } from "../color";

type DayStats = {
  minutes: number;
  count: number;
};

async function getStats(supabase: SupabaseClient<Database>, during: string) {
  const data = safeQuery(
    await supabase.rpc("day_stats", {
      _account_id: 8664,
      during,
    })
  )?.reduce(
    (acc, { type, minutes, num }) => {
      acc[type] = {
        minutes,
        count: num,
      };
      return acc;
    },
    {
      focus: { minutes: 0, count: 0 },
      internal: { minutes: 0, count: 0 },
      external: { minutes: 0, count: 0 },
      growth: { minutes: 0, count: 0 },
    } as { [key: string]: DayStats }
  );
  return data;
}

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const [current, previous] = getDateRange(new URL(request.url).searchParams);
  const during = `[${current[0].toISOString()}, ${current[1].toISOString()})`;
  const previousDuring = `[${previous[0].toISOString()}, ${previous[1].toISOString()})`;

  const data = await getStats(supabase, during);
  const previousData = await getStats(supabase, previousDuring);

  return json(
    {
      data,
      previousData,
      accountId,
    },
    { headers: response.headers }
  );
};

function StatCard({
  title,
  pastMinutes,
  scheduledMinutes,
  projectedMinutes,
  targetMinutes,
  trend,
  description,
  color,
  maximize,
  links,
}: {
  title: string;
  pastMinutes: number;
  scheduledMinutes: number;
  projectedMinutes: number;
  targetMinutes?: number;
  trend?: number;
  description: string;
  color: string;
  maximize?: boolean;
  links: any;
}) {
  const { colorScheme } = useMantineColorScheme();
  return (
    <Card>
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
          pastMinutes={pastMinutes}
          scheduledMinutes={scheduledMinutes}
          projectedMinutes={projectedMinutes}
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

function weeklyMinutesToAnnualWeeks(minutes: number) {
  const weeksInYear = 48;
  const daysInWeek = 5;
  return ((minutes / 60) * weeksInYear) / daysInWeek;
}

const HOURS_PER_WEEK = 40;

export default function MeetingLoad() {
  const { colorScheme } = useMantineColorScheme();
  const { useHeaderControl } = useOutletContext<SupabaseOutletContext>();
  const { data, previousData } = useLoaderData<typeof loader>();
  useHeaderControl(() => <DateRange />);

  if (!data || !previousData) return null;

  const otherHours =
    HOURS_PER_WEEK -
    (data.focus.minutes + data.internal.minutes + data.external.minutes) / 60;
  const previousOtherHours =
    HOURS_PER_WEEK -
    (previousData.focus.minutes +
      previousData.internal.minutes +
      previousData.external.minutes) /
      60;
  const chartData = [
    {
      id: "internal",
      value: data.internal.minutes / 60,
    },
    {
      id: "external",
      value: data.external.minutes / 60,
    },
    {
      id: "focus",
      value: data.focus.minutes / 60,
    },
    {
      id: "growth",
      value: data.growth.minutes / 60,
    },
    {
      id: "other",
      value: otherHours,
    },
  ];

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
          pastMinutes={9 * 60}
          scheduledMinutes={4 * 60}
          projectedMinutes={14 * 60}
          targetMinutes={10 * 60}
          trend={7}
          description={`You attend ${data.internal.count} meetings totalling ${
            data.internal.minutes
          } minutes each week. That's ${Math.round(
            weeklyMinutesToAnnualWeeks(data.internal.minutes)
          )} weeks annually.`}
          color="orange"
          links={[
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 8, 1, colorScheme),
              label: "9 scheduled",
            },
            {
              icon: <IconCalendarQuestion />,
              color: makeColor("yellow", 9, 2, colorScheme),
              label: "3 pending",
            },
            {
              icon: <IconCalendarX />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "2 declined",
            },
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "17 done",
            },
          ]}
        />
        <StatCard
          title={"Customer Meetings"}
          pastMinutes={2 * 60}
          scheduledMinutes={1.5 * 60}
          projectedMinutes={3.5 * 60}
          targetMinutes={3 * 60}
          trend={10}
          maximize={true}
          description={`You had ${data.external.count} external meetings.`}
          color="yellow"
          links={[
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 8, 1, colorScheme),
              label: "2 scheduled",
            },
            {
              icon: <IconCalendarQuestion />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "0 pending",
            },
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "2 done",
            },
            {
              icon: <IconCalendarX />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "0 declined",
            },
          ]}
        />
        <StatCard
          title={"Deep Work Blocks"}
          pastMinutes={11 * 60}
          scheduledMinutes={9 * 60}
          projectedMinutes={18 * 60}
          targetMinutes={22 * 60}
          maximize={true}
          trend={5}
          description={`You have ${
            data.focus.minutes
          } minutes of focus time each week, with an average length of ${Math.round(
            data.focus.minutes / data.focus.count
          )} minutes.`}
          color="blue"
          links={[
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 8, 1, colorScheme),
              label: "3 scheduled",
            },
            {
              icon: <IconCalendarExclamation />,
              color: makeColor("yellow", 9, 2, colorScheme),
              label: "1 conflict",
            },
            {
              icon: <IconCalendarX />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "1 skipped",
            },
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "5 done",
            },
          ]}
        />
        <StatCard
          title={"Health, Growth & Giving Activities"}
          pastMinutes={30}
          scheduledMinutes={0}
          projectedMinutes={30}
          trend={-20}
          maximize={true}
          description={`.`}
          color="cyan"
          links={[
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "0 scheduled",
            },
            {
              icon: <IconCalendarQuestion />,
              color: makeColor("yellow", 9, 2, colorScheme),
              label: "2 pending",
            },
            {
              icon: <IconCalendarX />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "1 skipped",
            },
            {
              icon: <IconCalendarCheck />,
              color: makeColor("gray", 6, 5, colorScheme),
              label: "1 done",
            },
          ]}
        />
      </SimpleGrid>
    </>
  );
}
