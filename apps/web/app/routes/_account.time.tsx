/** @jsxfrag */
import type { LoaderArgs } from "@remix-run/cloudflare";

import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import {
  AspectRatio,
  Box,
  Card,
  Center,
  Title,
  Text,
  Grid,
  Group,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { ResponsiveWaffle } from "@nivo/waffle";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

import type { Database } from "@divvy/db";
import { getDateRange } from "./_account";
import {
  createServerClient,
  getAccountId,
  safeQuery,
  durationFmt,
} from "../util";
import { SupabaseClient } from "@supabase/supabase-js";

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
  minutes,
  trend,
  description,
  color,
  maximize,
}: {
  title: string;
  minutes: number;
  trend: number;
  description: string;
  color: string;
  maximize?: boolean;
}) {
  const goodTrend = !!maximize === trend > 0;
  return (
    <Card>
      <Card.Section>
        <Box h="0.5em" w="100%" bg={color} />
      </Card.Section>
      <Title order={2} size="h4" fw={500} mt="md" color={color}>
        {title}
      </Title>
      <Group>
        <Center>
          <Text fz={32} fw={700} p="lg" ta="center">
            {durationFmt(minutes)}
          </Text>
          {trend !== 0 && (
            <Stack spacing={0}>
              {trend > 0 && <IconTrendingUp />}
              {trend < 0 && <IconTrendingDown />}
              <Text c={goodTrend ? "green.4" : "red.4"}>{trend}</Text>
            </Stack>
          )}
        </Center>
      </Group>
      <Text>{description}</Text>
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
  const theme = useMantineTheme();
  const colors = [
    theme.colors.orange[4],
    theme.colors.yellow[4],
    theme.colors.blue[4],
    theme.colors.teal[4],
    theme.colors.gray[4],
  ];
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
        <Grid.Col sm={12} md={6} lg={2}>
          <AspectRatio ratio={5 / 8}>
            <ResponsiveWaffle
              colors={colors}
              data={chartData}
              isInteractive={false}
              fillDirection="bottom"
              total={HOURS_PER_WEEK}
              rows={8}
              columns={5}
              padding={2}
              borderRadius={0}
              motionStagger={2}
            />
          </AspectRatio>
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={2}>
          <StatCard
            title={"Work Meetings"}
            minutes={data.internal.minutes}
            trend={data.internal.minutes - previousData.internal.minutes}
            description={`You attend ${
              data.internal.count
            } meetings totalling ${
              data.internal.minutes
            } minutes each week. That's ${Math.round(
              weeklyMinutesToAnnualWeeks(data.internal.minutes)
            )} weeks annually.`}
            color="orange.4"
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={2}>
          <StatCard
            title={"Customer Meetings"}
            minutes={data.external.minutes}
            trend={data.external.minutes - previousData.external.minutes}
            maximize={true}
            description={`You had ${data.external.count} external meetings.`}
            color="yellow.4"
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={2}>
          <StatCard
            title={"Deep Work"}
            minutes={data.focus.minutes}
            trend={data.focus.minutes - previousData.focus.minutes}
            maximize={true}
            description={`You have ${
              data.focus.minutes
            } minutes of focus time each week, with an average length of ${Math.round(
              data.focus.minutes / data.focus.count
            )} minutes.`}
            color="blue.4"
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={2}>
          <StatCard
            title={"Health, Growth & Giving"}
            minutes={data.growth.minutes}
            trend={data.growth.minutes - previousData.growth.minutes}
            description={`.`}
            color="teal.4"
          />
        </Grid.Col>
      </Grid>
    </>
  );
}
