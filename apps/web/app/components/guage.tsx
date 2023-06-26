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
  RingProgress,
  useMantineTheme,
} from "@mantine/core";
import { ResponsivePie } from "@nivo/pie";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

import { durationFmt } from "../util";

export type GuageSections = {
  label: string;
  color: string;
  shade: number;
  value: number;
};
export function Guage({
  sections,
  label,
  total,
}: {
  sections: GuageSections[];
  label: React.ReactNode;
  total?: number;
}) {
  const theme = useMantineTheme();
  const graphSections = sections
    .map(({ label, color, shade, value }) => ({
      id: label,
      value,
      label: `${label}: ${durationFmt(value)}`,
      color: theme.fn.themeColor(color, shade),
    }))
    .concat(
      total
        ? [
            {
              id: "empty",
              value:
                total - sections.reduce((acc, { value }) => acc + value, 0),
              label: "",
              color: theme.fn.themeColor("gray", 7),
            },
          ]
        : []
    );
  return (
    <Box p={15}>
      <AspectRatio ratio={0.9} w="100%">
        <ResponsivePie
          data={graphSections}
          colors={graphSections.map(({ color }) => color)}
          startAngle={-90}
          innerRadius={0.8}
          enableArcLabels={false}
          enableArcLinkLabels={false}
        />
        <Stack spacing={0}>{label}</Stack>
      </AspectRatio>
    </Box>
  );
}

export function ProjectionGuage({
  pastMinutes,
  scheduledMinutes,
  projectedMinutes,
  color,
  trend,
  maximize,
}: {
  pastMinutes: number;
  scheduledMinutes: number;
  projectedMinutes: number;
  color: string;
  trend?: number;
  maximize?: boolean;
}) {
  const diff = projectedMinutes - pastMinutes - scheduledMinutes;
  const sections = [
    {
      label: "Past",
      value: pastMinutes,
      color,
      shade: 7,
    },
    {
      label: "Scheduled",
      value: scheduledMinutes,
      color,
      shade: 4,
    },
    ...(diff >= 0
      ? [
          {
            label: "Projected",
            value: diff,
            color,
            shade: 2,
          },
        ]
      : []),
  ];
  const DiffIcon = trend && trend > 0 ? IconArrowUpRight : IconArrowDownRight;
  return (
    <Guage
      sections={sections}
      label={
        <>
          {!!trend && (
            <Text fz="sm" fw={500} mb="md">
              <span>&nbsp;</span>
            </Text>
          )}
          <Text color="gray.5" ta="center">
            Projected
          </Text>
          <Text fz={32} fw={700} ta="center">
            {durationFmt(projectedMinutes)}
          </Text>
          <Text color="gray.5" ta="center">
            hrs/wk
          </Text>
          {!!trend && (
            <Text
              color={!!maximize === trend > 0 ? "teal.4" : "red.4"}
              fz="sm"
              fw={500}
              mt="md"
            >
              <Group spacing={0}>
                <span>{trend}%</span>
                <DiffIcon size="1rem" stroke={1.5} />
              </Group>
            </Text>
          )}
        </>
      }
    />
  );
}

export function TargetGuage({
  targetMinutes,
  projectedMinutes,
  maximize,
}: {
  targetMinutes?: number;
  projectedMinutes: number;
  maximize?: boolean;
}) {
  if (targetMinutes === undefined) {
    return (
      <Guage
        sections={[]}
        label={
          <Text fz={24} color="gray.5" ta="center">
            Set target
          </Text>
        }
        total={projectedMinutes * 2}
      />
    );
  }
  let sections;
  if (projectedMinutes < targetMinutes) {
    sections = [
      {
        label: "Projected",
        value: projectedMinutes,
        color: "green",
        shade: 4,
      },
      {
        label: "Under target",
        value: targetMinutes - projectedMinutes,
        color: maximize ? "red" : "green",
        shade: maximize ? 4 : 2,
      },
    ];
  } else {
    sections = [
      {
        label: "Target",
        value: targetMinutes,
        color: "green",
        shade: 4,
      },
      {
        label: "Over target",
        value: projectedMinutes - targetMinutes,
        color: maximize ? "green" : "red",
        shade: maximize ? 2 : 4,
      },
    ];
  }
  const DiffIcon = maximize ? IconArrowUpRight : IconArrowDownRight;
  return (
    <Guage
      sections={sections}
      total={targetMinutes * 2}
      label={
        <>
          <Text fz="sm" fw={500} mt="md">
            <span>&nbsp;</span>
          </Text>
          <Text color="gray.5" ta="center">
            Target
          </Text>
          <Text fz={32} fw={700} ta="center">
            {durationFmt(targetMinutes)}
          </Text>
          <Text color="gray.5" ta="center">
            hrs/wk
          </Text>
          <Text color="gray.6" fz="sm" fw={500} mt="md">
            <Group spacing={0}>
              <DiffIcon size="1rem" stroke={1.5} />
              <span>&nbsp;is better</span>
            </Group>
          </Text>
        </>
      }
    />
  );
}
