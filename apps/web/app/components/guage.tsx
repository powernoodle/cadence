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
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

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
              color: theme.fn.themeColor("gray", 4),
            },
          ]
        : []
    );
  console.log(graphSections);
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
}: {
  pastMinutes: number;
  scheduledMinutes: number;
  projectedMinutes: number;
  color: string;
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
  return (
    <Guage
      sections={sections}
      label={
        <>
          <Text color="gray.5" ta="center">
            Projected
          </Text>
          <Text fz={32} fw={700} ta="center">
            {durationFmt(projectedMinutes)}
          </Text>
          <Text color="gray.5" ta="center">
            hrs/wk
          </Text>
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
  if (projectedMinutes < targetMinutes) {
    const sections = [
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
    return (
      <Guage
        sections={sections}
        total={targetMinutes * 2}
        label={
          <>
            <Text color="gray.5" ta="center">
              Target
            </Text>
            <Text fz={32} fw={700} ta="center">
              {durationFmt(targetMinutes)}
            </Text>
            <Text color="gray.5" ta="center">
              hrs/wk
            </Text>
          </>
        }
      />
    );
  }
  const sections = [
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
  return (
    <Guage
      sections={sections}
      total={targetMinutes * 2}
      label={
        <>
          <Text color="gray.5" ta="center">
            Target
          </Text>
          <Text fz={32} fw={700} ta="center">
            {durationFmt(targetMinutes)}
          </Text>
          <Text color="gray.5" ta="center">
            hrs/wk
          </Text>
        </>
      }
    />
  );
}
