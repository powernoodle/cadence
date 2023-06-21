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

import { createServerClient, getAccountId } from "../util";

type TimeStats = {
  hours: number;
  count: number;
};

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const data: { [id: string]: TimeStats } = {
    focus: {
      hours: 8,
      count: 11,
    },
    internal: {
      hours: 23,
      count: 31,
    },
    external: {
      hours: 3,
      count: 6,
    },
    personal: {
      hours: 6,
      count: 13,
    },
    slack: {
      hours: 6,
      count: 13,
    },
  };
  const previousData: { [id: string]: TimeStats } = {
    focus: {
      hours: 9,
      count: 11,
    },
    internal: {
      hours: 21,
      count: 29,
    },
    external: {
      hours: 3,
      count: 6,
    },
    personal: {
      hours: 2,
      count: 13,
    },
    slack: {
      hours: 5,
      count: 13,
    },
  };

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
  stat,
  trend,
  description,
  color,
  maximize,
}: {
  title: string;
  stat: number;
  trend: number;
  description: string;
  color: string;
  maximize?: boolean;
}) {
  const trendPercent = Math.round(Math.abs(trend - 1) * 100);
  const goodTrend = !!maximize === trend > 1;
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
            {Math.round(stat)}%
          </Text>
          {trendPercent !== 0 && (
            <Stack spacing={0}>
              {trend > 1 && <IconTrendingUp />}
              {trend < 1 && <IconTrendingDown />}
              <Text c={goodTrend ? "green.4" : "red.4"}>{trendPercent}%</Text>
            </Stack>
          )}
        </Center>
      </Group>
      <Text>{description}</Text>
    </Card>
  );
}

function weeklyHoursToAnnualWeeks(hours: number) {
  const weeksInYear = 48;
  const daysInWeek = 5;
  return (hours * weeksInYear) / daysInWeek;
}

const HOURS_PER_WEEK = 40;

export default function MeetingLoad() {
  const { data, previousData } = useLoaderData<typeof loader>();
  const theme = useMantineTheme();
  const colors = [
    theme.colors.teal[4],
    theme.colors.orange[4],
    theme.colors.violet[3],
    theme.colors.gray[4],
  ];

  const otherHours =
    HOURS_PER_WEEK -
    data.focus.hours -
    data.internal.hours -
    data.external.hours;
  const previousOtherHours =
    HOURS_PER_WEEK -
    previousData.focus.hours -
    previousData.internal.hours -
    previousData.external.hours;
  const chartData = [
    {
      id: "focus",
      label: "Focus time",
      value: data.focus.hours,
    },
    {
      id: "internal",
      label: "Meetings (internal)",
      value: data.internal.hours,
    },
    {
      id: "external",
      label: "Meetings (external)",
      value: data.external.hours,
    },
    {
      id: "other",
      label: "Other",
      value: otherHours,
    },
  ];

  return (
    <>
      <Grid columns={12}>
        <Grid.Col sm={12} md={6} lg={2}>
          <Title order={2} size="h2" mb="lg">
            Weekly working hours
          </Title>
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
            title={"Focus time"}
            stat={(data.focus.hours / HOURS_PER_WEEK) * 100}
            trend={data.focus.hours / previousData.focus.hours}
            maximize={true}
            description={`You have ${
              data.focus.hours
            } hours of focus time each week, with an average length of ${Math.round(
              (data.focus.hours * 60) / data.focus.count
            )} minutes.`}
            color="teal.4"
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={2}>
          <StatCard
            title={"Internal meetings"}
            stat={(data.internal.hours / HOURS_PER_WEEK) * 100}
            trend={data.internal.hours / previousData.internal.hours}
            description={`You attend ${
              data.internal.count
            } meetings totalling ${
              data.internal.hours
            } hours each week. That's ${Math.round(
              weeklyHoursToAnnualWeeks(data.internal.hours)
            )} weeks annually.`}
            color="orange.4"
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={2}>
          <StatCard
            title={"External meetings"}
            stat={(data.external.hours / HOURS_PER_WEEK) * 100}
            trend={data.external.hours / previousData.external.hours}
            maximize={true}
            description={`You had ${data.external.count} external meetings.`}
            color="violet.3"
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={2}>
          <StatCard
            title={"Other"}
            stat={(otherHours / HOURS_PER_WEEK) * 100}
            trend={otherHours / previousOtherHours}
            description={`Your calendar has ${data.slack.count} gaps of 30 minutes or less between meetings.`}
            color="gray.4"
          />
        </Grid.Col>
      </Grid>
    </>
  );
}
