import { useState } from "react";
import {
  AspectRatio,
  Button,
  NumberInput,
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
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconCheck,
  IconX,
} from "@tabler/icons-react";

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
  const sectionsTotal = sections.reduce((acc, { value }) => acc + value, 0);
  if (sectionsTotal === 0) total = 1;
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
              value: total - sectionsTotal,
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
                <Paper p={2} pl="xs" pr="xs" bg="dark.7">
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
  pendingMinutes,
  color,
  trend,
  maximize,
  label,
}: {
  pastMinutes: number;
  scheduledMinutes: number;
  pendingMinutes: number;
  color: string;
  trend?: number;
  maximize?: boolean;
  label: string;
}) {
  if (!trend || isNaN(trend) || trend === Infinity) {
    trend = 0;
  }
  trend = Math.round(trend);
  const { colorScheme } = useMantineColorScheme();
  const projectedMinutes = pastMinutes + scheduledMinutes + pendingMinutes;
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
    {
      label: "Pending",
      value: pendingMinutes,
      color,
      shade: 2,
    },
  ];
  const DiffIcon = trend > 0 ? IconArrowUpRight : IconArrowDownRight;
  return (
    <Guage
      sections={sections}
      label={
        <Stack spacing={0} align="center">
          <Text fz="lg" color={makeColor("gray", 6, 5, colorScheme)} mt="md">
            {label}
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
              !!maximize === trend > 0 ? "teal" : "red",
              5,
              3,
              colorScheme
            )}
            mt="md"
          >
            <Group spacing={0}>
              {trend !== 0 ? (
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
  const [edit, setEdit] = useState(false);
  let sections: GuageSections[] = [];
  if (targetMinutes) {
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
  }
  const DiffIcon = maximize ? IconArrowUpRight : IconArrowDownRight;
  return (
    <Guage
      sections={sections}
      total={targetMinutes ? targetMinutes * 2 : 0}
      label={
        <Stack spacing={0} align="center">
          {(targetMinutes !== undefined || edit) && (
            <Text fz="lg" color={makeColor("gray", 6, 5, colorScheme)} mt="md">
              Target
            </Text>
          )}
          {!edit && (
            <Button
              variant="subtle"
              onClick={() => setEdit(true)}
              sx={{ height: "50px" }}
            >
              {targetMinutes === undefined && (
                <Text
                  fz={24}
                  fw={300}
                  color={makeColor("gray", 6, 5, colorScheme)}
                >
                  Set target
                </Text>
              )}
              {targetMinutes !== undefined && (
                <Text
                  fz={32}
                  fw={700}
                  color={makeColor("gray", 8, 2, colorScheme)}
                >
                  {durationFmt(targetMinutes)}
                </Text>
              )}
            </Button>
          )}
          {edit && (
            <Group pt={4} pb={4} spacing={2} sx={{ height: "50px" }}>
              <NumberInput
                defaultValue={3600}
                precision={0}
                min={0}
                max={3600}
                sx={{ width: "5em" }}
              />
              <Text>:</Text>
              <NumberInput
                defaultValue={0}
                formatter={(n) => String(n).padStart(2, "0")}
                precision={0}
                min={0}
                max={59}
                sx={{ width: "4em" }}
              />
            </Group>
          )}
          {(targetMinutes !== undefined || edit) && (
            <Text fz="sm" color={makeColor("gray", 6, 5, colorScheme)}>
              hours/week
            </Text>
          )}
          {targetMinutes !== undefined && !edit && (
            <Text fz="sm" color={makeColor("gray", 6, 5, colorScheme)} mt="md">
              <Group spacing={0}>
                <DiffIcon size="1rem" stroke={1.5} />
                <span>&nbsp;is better</span>
              </Group>
            </Text>
          )}
          {edit && (
            <Group mt="xs" spacing={0}>
              <Button
                compact
                variant="subtle"
                onClick={() => setEdit(false)}
                title="Save"
              >
                <IconCheck />
              </Button>
              <Button
                compact
                variant="subtle"
                onClick={() => setEdit(false)}
                title="Cancel"
              >
                <IconX />
              </Button>
            </Group>
          )}
        </Stack>
      }
    />
  );
}
