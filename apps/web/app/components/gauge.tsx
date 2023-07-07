import {
  AspectRatio,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { patternLinesDef } from "@nivo/core";
import { ResponsivePie } from "@nivo/pie";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconMinus,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";
import { useState } from "react";

import { makeColor } from "../color";
import { durationFmt } from "../util";

export type GaugeSection = {
  label: string;
  color: string;
  shade: number;
  value: number;
};

export function Gauge({
  sections,
  label,
  total,
}: {
  sections: GaugeSection[];
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
                colorScheme === "light" ? 1 : 8
              ),
            },
          ]
        : []
    );
  return (
    <Flex p={15} w="100%" justify="center">
      <AspectRatio ratio={1} w="100%" maw="20rem">
        <Box>
          <Center sx={{ zIndex: 102 }}>{label}</Center>
        </Box>
        <Box
          sx={{
            overflow: "visible !important",
            zIndex: 101,
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
    </Flex>
  );
}

export function TargetGauge({
  title,
  pastMinutes,
  scheduledMinutes,
  pendingMinutes,
  targetMinutes,
  totalMinutes,
  color,
  trend,
  maximize,
  onChange,
}: {
  title: string;
  pastMinutes: number;
  scheduledMinutes: number;
  pendingMinutes: number;
  totalMinutes: number;
  targetMinutes?: number;
  color: string;
  trend?: number;
  maximize?: boolean;
  onChange?: (target: number) => void;
}) {
  const actualMinutes = pastMinutes + scheduledMinutes;
  const { colorScheme } = useMantineColorScheme();
  const [edit, setEdit] = useState(false);
  const showTarget = targetMinutes !== undefined;
  const target = targetMinutes ?? Math.round(actualMinutes / 30) * 30;

  let sections: GaugeSection[] = [];
  let sectionsTotal = 0;
  if (edit) {
    sections = [
      {
        label: "Target",
        value: target,
        color,
        shade: 7,
      },
    ];
  } else {
    const addSection = (section: GaugeSection) => {
      if (section.value === 0) return;
      if (!showTarget || sectionsTotal < targetMinutes) {
        sections = [
          ...sections,
          {
            ...section,
            value: targetMinutes
              ? Math.min(sectionsTotal + section.value, targetMinutes) -
                sectionsTotal
              : section.value,
          },
        ];
      }
      if (showTarget && sectionsTotal + section.value > targetMinutes) {
        sections = [
          ...sections,
          {
            ...section,
            label: `${section.label} (over target)`,
            color: maximize ? "green" : "red",
            value: sectionsTotal + section.value - targetMinutes,
          },
        ];
      }
      sectionsTotal += section.value;
    };
    addSection({
      label: "Attended",
      value: pastMinutes,
      color,
      shade: 7,
    });
    addSection({
      label: "Scheduled",
      value: scheduledMinutes,
      color,
      shade: 4,
    });
    addSection({
      label: "Pending",
      value: pendingMinutes,
      color,
      shade: 2,
    });
    if (showTarget && actualMinutes < targetMinutes) {
      sections = [
        ...sections,
        {
          label: "Under target",
          value: targetMinutes - actualMinutes,
          color: "gray",
          shade: colorScheme === "light" ? 6 : 3,
        },
      ];
    }
  }

  if (!trend || isNaN(trend) || trend === Infinity || edit) {
    trend = 0;
  }
  trend = Math.round(trend);
  const DiffIcon = trend > 0 ? IconArrowUpRight : IconArrowDownRight;

  return (
    <Gauge
      sections={sections}
      total={totalMinutes}
      label={
        <Stack spacing={0} align="center">
          <Text
            color={makeColor(color, 6, 5, colorScheme)}
            fz="lg"
            fw={700}
            pt={10}
            pb={10}
          >
            {title}
          </Text>
          <Group spacing="xs">
            {edit && (
              <Button
                compact
                variant="outline"
                onClick={() => {
                  onChange?.(Math.max(target - 30, 0));
                }}
                disabled={target <= 0}
                title="Decrease"
              >
                <IconMinus />
              </Button>
            )}
            <Text
              fz={36}
              fw={700}
              color={makeColor("gray", 8, 2, colorScheme)}
              title={`${Math.floor(
                (edit ? target : actualMinutes) / 60
              )} hours, ${
                (edit ? target : actualMinutes) % 60
              } minutes per week`}
            >
              {durationFmt(edit ? target : actualMinutes)}
            </Text>
            {edit && (
              <Button
                compact
                variant="outline"
                onClick={() => {
                  onChange?.(target + 30);
                }}
                title="Increase"
              >
                <IconPlus />
              </Button>
            )}
          </Group>
          {!edit && targetMinutes !== undefined && (
            <Button
              compact
              variant="subtle"
              title="Edit target"
              onClick={() => setEdit(true)}
              leftIcon={<Box w="1em" />}
              rightIcon={<IconPencil size="1em" />}
            >
              <Text
                span
                color={makeColor(
                  targetMinutes && !!maximize === actualMinutes > targetMinutes
                    ? "teal"
                    : "red",
                  6,
                  3,
                  colorScheme
                )}
              >
                {durationFmt(Math.abs(targetMinutes - actualMinutes))}{" "}
                {actualMinutes < targetMinutes ? "under" : "over"}
              </Text>
            </Button>
          )}
          {(edit || targetMinutes === undefined) && (
            <Group>
              <Button
                variant="outline"
                compact
                onClick={() => {
                  if (edit) onChange?.(target);
                  setEdit(!edit);
                }}
              >
                {edit ? "Save" : "Set"} Target
              </Button>
            </Group>
          )}
          <Text
            fz="sm"
            fw={600}
            color={makeColor(
              !!maximize === trend > 0 ? "teal" : "red",
              6,
              3,
              colorScheme
            )}
          >
            <Group spacing={0}>
              {trend !== 0 ? (
                <>
                  <DiffIcon size="1rem" stroke={1.5} />
                  <span>{Math.abs(trend)}%</span>
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
