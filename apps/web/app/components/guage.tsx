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
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

import { durationFmt } from "../util";

export type GuageSections = {
  label: string;
  color: string;
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
  if (!total) {
    total = sections.reduce((acc, { value }) => acc + value, 0) || 100;
  }
  const graphSections = sections.map(({ label, color, value }) => ({
    value: (value / (total as number)) * 100,
    tooltip: `${label}: ${durationFmt(value)}`,
    color,
  }));
  return (
    <RingProgress
      size={300}
      thickness={30}
      sections={graphSections}
      label={label}
    />
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
      color: `${color}.7`,
    },
    {
      label: "Scheduled",
      value: scheduledMinutes,
      color: `${color}.4`,
    },
    ...(diff >= 0
      ? [
          {
            label: "Projected",
            value: diff,
            color: `${color}.2`,
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
        color: "green.4",
      },
      {
        label: "Under target",
        value: targetMinutes - projectedMinutes,
        color: maximize ? "red.4" : "green.2",
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
      color: "green.4",
    },
    {
      label: "Over target",
      value: projectedMinutes - targetMinutes,
      color: maximize ? "green.2" : "red.4",
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
