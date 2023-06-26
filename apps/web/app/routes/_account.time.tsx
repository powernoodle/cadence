/** @jsxfrag */
import type { LoaderArgs } from "@remix-run/cloudflare";

import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import {
  AspectRatio,
  SimpleGrid,
  Box,
  Card,
  Center,
  Title,
  Navbar,
  NavLink,
  Anchor,
  Text,
  Grid,
  Group,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { ResponsiveWaffle } from "@nivo/waffle";
import {
  IconZoomCheckFilled,
  IconZoomCheck,
  IconZoomQuestion,
  IconZoomCancel,
} from "@tabler/icons-react";

import type { Database } from "@divvy/db";
import { getDateRange } from "./_account";
import {
  createServerClient,
  getAccountId,
  safeQuery,
  durationFmt,
} from "../util";
import { SupabaseClient } from "@supabase/supabase-js";
import { ProjectionGuage, TargetGuage } from "../components/guage";

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
  return (
    <Card>
      <Title order={2} size="h4" fw={500} color={color + ".4"}>
        {title}
      </Title>
      <SimpleGrid cols={2}>
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
        {links.map((link: any, i: number) => (
          <Anchor key={i.toString()} href="#" color={link.color} pl={15}>
            <Group>
              {link.icon}
              <Text>{link.label}</Text>
            </Group>
          </Anchor>
        ))}
      </SimpleGrid>
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
  const { data, previousData } = useLoaderData<typeof loader>();
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
      <Grid columns={12}>
        <Grid.Col sm={12} md={6} lg={6}>
          <StatCard
            title={"Work Meetings"}
            pastMinutes={9 * 60}
            scheduledMinutes={4 * 60}
            projectedMinutes={14 * 60}
            targetMinutes={10 * 60}
            trend={7}
            description={`You attend ${
              data.internal.count
            } meetings totalling ${
              data.internal.minutes
            } minutes each week. That's ${Math.round(
              weeklyMinutesToAnnualWeeks(data.internal.minutes)
            )} weeks annually.`}
            color="orange"
            links={[
              {
                icon: <IconZoomCheckFilled />,
                color: "gray.5",
                label: "17 meetings done",
              },
              {
                icon: <IconZoomCheck />,
                color: "gray.1",
                label: "9 meetings scheduled",
              },
              {
                icon: <IconZoomCancel />,
                color: "gray.5",
                label: "2 meetings declined",
              },
              {
                icon: <IconZoomQuestion />,
                color: "yellow.2",
                label: "3 meetings pending",
              },
            ]}
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={6}>
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
                icon: <IconZoomCheckFilled />,
                color: "gray.5",
                label: "2 meetings done",
              },
              {
                icon: <IconZoomCheck />,
                color: "gray.1",
                label: "2 meetings scheduled",
              },
              {
                icon: <IconZoomCancel />,
                color: "gray.5",
                label: "No meetings declined",
              },
              {
                icon: <IconZoomQuestion />,
                color: "gray.5",
                label: "No meetings pending",
              },
            ]}
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={6}>
          <StatCard
            title={"Deep Work"}
            pastMinutes={11 * 60}
            scheduledMinutes={9 * 60}
            projectedMinutes={18 * 60}
            targetMinutes={22 * 60}
            trend={data.focus.minutes - previousData.focus.minutes}
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
                icon: <IconZoomCheckFilled />,
                color: "gray.5",
                label: "5 blocks done",
              },
              {
                icon: <IconZoomCheck />,
                color: "gray.1",
                label: "3 blocks scheduled",
              },
              {
                icon: <IconZoomCancel />,
                color: "gray.5",
                label: "1 block skipped",
              },
              {
                icon: <IconZoomQuestion />,
                color: "yellow.2",
                label: "1 block with conflicts",
              },
            ]}
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={6}>
          <StatCard
            title={"Health, Growth & Giving"}
            pastMinutes={30}
            scheduledMinutes={0}
            projectedMinutes={30}
            trend={data.growth.minutes - previousData.growth.minutes}
            description={`.`}
            color="cyan"
            links={[
              {
                icon: <IconZoomCheckFilled />,
                color: "gray.5",
                label: "1 activity done",
              },
              {
                icon: <IconZoomCheck />,
                color: "gray.5",
                label: "No activities scheduled",
              },
              {
                icon: <IconZoomCancel />,
                color: "gray.5",
                label: "1 activity skipped",
              },
              {
                icon: <IconZoomQuestion />,
                color: "yellow.2",
                label: "2 activities pending",
              },
            ]}
          />
        </Grid.Col>
      </Grid>
    </>
  );
}