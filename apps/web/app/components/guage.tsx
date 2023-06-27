import {
  AspectRatio,
  Box,
  Center,
  Text,
  Paper,
  Group,
  Stack,
  useMantineTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { ResponsivePie } from "@nivo/pie";
import { IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

import { makeColor } from "../color";
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
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const graphSections = sections
    .map(({ label, color, shade, value }) => ({
      id: label,
      value,
      label: `${label}: ${durationFmt(value)} hours`,
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
              color: theme.fn.themeColor(
                "gray",
                colorScheme === "light" ? 2 : 7
              ),
            },
          ]
        : []
    );
  return (
    <Box p={15}>
      <AspectRatio ratio={1} w="100%">
        <Box>
          <Center sx={{ zIndex: 1 }}>{label}</Center>
        </Box>
        <Box
          sx={{
            overflow: "visible !important",
          }}
        >
          <ResponsivePie
            data={graphSections}
            colors={graphSections.map(({ color }) => color)}
            startAngle={-90}
            innerRadius={0.8}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            tooltip={(d) =>
              d.datum.label ? (
                <Paper p="xs">
                  <Text color={d.datum.color}>{d.datum.label}</Text>
                </Paper>
              ) : null
            }
          />
        </Box>
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
  const { colorScheme } = useMantineColorScheme();
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
        <Stack spacing={0} align="center">
          <Text fz="lg" color={makeColor("gray", 6, 5, colorScheme)} mt="md">
            Projected
          </Text>
          <Text fz={32} fw={700} color={makeColor("gray", 8, 2, colorScheme)}>
            {durationFmt(projectedMinutes)}
          </Text>
          <Text fz="sm" color={makeColor("gray", 6, 5, colorScheme)}>
            hours/week
          </Text>
          <Text
            fz="sm"
            fw={500}
            color={makeColor(
              !!maximize === (trend ?? 0) > 0 ? "teal" : "red",
              5,
              3,
              colorScheme
            )}
            mt="md"
          >
            <Group spacing={0}>
              {!!trend ? (
                <>
                  <DiffIcon size="1rem" stroke={1.5} />
                  <span>{trend}%</span>
                </>
              ) : (
                <span>&nbsp;</span>
              )}
            </Group>
          </Text>
        </Stack>
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
  const { colorScheme } = useMantineColorScheme();
  if (targetMinutes === undefined) {
    return (
      <Guage
        sections={[]}
        label={
          <Text
            fz={24}
            color={makeColor("gray", 6, 5, colorScheme)}
            ta="center"
          >
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
        <Stack spacing={0}>
          <Text
            fz="lg"
            color={makeColor("gray", 6, 5, colorScheme)}
            ta="center"
            mt="md"
          >
            Target
          </Text>
          <Text
            fz={32}
            fw={700}
            color={makeColor("gray", 8, 2, colorScheme)}
            ta="center"
          >
            {durationFmt(targetMinutes)}
          </Text>
          <Text
            fz="sm"
            color={makeColor("gray", 6, 5, colorScheme)}
            ta="center"
          >
            hours/week
          </Text>
          <Text fz="sm" color={makeColor("gray", 6, 5, colorScheme)} mt="md">
            <Group spacing={0}>
              <DiffIcon size="1rem" stroke={1.5} />
              <span>&nbsp;is better</span>
            </Group>
          </Text>
        </Stack>
      }
    />
  );
}
