import {
  AspectRatio,
  Button,
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
import { patternLinesDef } from "@nivo/core";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconPlus,
  IconMinus,
} from "@tabler/icons-react";

import { makeColor } from "../color";
import { durationFmt } from "../util";

export type GaugeSection = {
  label: string;
  color: string;
  fill?: boolean;
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
    .map(({ label, color, shade, value, fill }) => ({
      id: label,
      value,
      label: `${label}: ${durationFmt(value)} hours`,
      color: theme.fn.themeColor(color, shade),
      fill: !!fill,
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
              fill: false,
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
            defs={[
              patternLinesDef("lines", {
                background: "inherit",
                color: "gray",
              }),
              { id: "custom", type: "patternSquares", size: 24 },
            ]}
            fill={[
              {
                match: (d) => d.data.fill,
                id: "lines",
              },
            ]}
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

export function EditGauge({
  averageMinutes,
  targetMinutes,
  totalMinutes,
  color,
  maximize,
  onChange,
}: {
  averageMinutes: number;
  targetMinutes?: number;
  totalMinutes: number;
  color: string;
  maximize?: boolean;
  onChange?: (target: number) => void;
}) {
  const target = targetMinutes ?? 0;
  const { colorScheme } = useMantineColorScheme();

  return (
    <Gauge
      sections={
        targetMinutes
          ? [
              {
                label: "Target",
                value: targetMinutes,
                color,
                shade: 7,
              },
            ]
          : []
      }
      total={totalMinutes}
      label={
        <Stack spacing="sm" align="center">
          <Text fw={500}>Target</Text>
          <Group spacing="xs">
            <Button
              compact
              variant="outline"
              onClick={() => {
                onChange?.(target - 30);
              }}
              title="Decrease"
            >
              <IconMinus />
            </Button>
            <Text fz={36} fw={700} color={makeColor("gray", 8, 2, colorScheme)}>
              {durationFmt(target)}
            </Text>
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
          </Group>
          <Text fw={500} color={makeColor("gray", 8, 2, colorScheme)}>
            {averageMinutes !== target ? (
              <>
                {durationFmt(Math.abs(target - averageMinutes))}{" "}
                {target < averageMinutes ? "under average" : "over average"}
              </>
            ) : (
              <>&nbsp;</>
            )}
          </Text>
        </Stack>
      }
    />
  );
}

export function TargetGauge({
  pastMinutes,
  scheduledMinutes,
  pendingMinutes,
  targetMinutes,
  totalMinutes,
  color,
  trend,
  maximize,
}: {
  pastMinutes: number;
  scheduledMinutes: number;
  pendingMinutes: number;
  totalMinutes: number;
  targetMinutes?: number;
  color: string;
  trend?: number;
  maximize?: boolean;
}) {
  const projectedMinutes = pastMinutes + scheduledMinutes + pendingMinutes;
  const { colorScheme } = useMantineColorScheme();
  const showTarget = targetMinutes !== undefined;

  let sections: GaugeSection[] = [];
  let sectionsTotal = 0;
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
  if (showTarget && projectedMinutes < targetMinutes) {
    sections = [
      ...sections,
      {
        label: "Under target",
        value: targetMinutes - projectedMinutes,
        color: "gray",
        shade: colorScheme === "light" ? 6 : 3,
      },
    ];
  }

  if (!trend || isNaN(trend) || trend === Infinity) {
    trend = 0;
  }
  trend = Math.round(trend);
  const DiffIcon = trend > 0 ? IconArrowUpRight : IconArrowDownRight;

  return (
    <Gauge
      sections={sections}
      total={totalMinutes}
      label={
        <Stack spacing="sm" align="center">
          <Text
            fw={500}
            color={makeColor(
              !!maximize === trend > 0 ? "teal" : "red",
              5,
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
          <Group spacing="xs">
            <Text fz={36} fw={700} color={makeColor("gray", 8, 2, colorScheme)}>
              {durationFmt(projectedMinutes)}
            </Text>
          </Group>
          <Text
            fw={500}
            color={makeColor(
              !!maximize && targetMinutes && projectedMinutes > targetMinutes
                ? "teal"
                : "red",
              5,
              3,
              colorScheme
            )}
          >
            {showTarget && projectedMinutes !== targetMinutes ? (
              <>
                {durationFmt(Math.abs(targetMinutes - projectedMinutes))}{" "}
                {projectedMinutes < targetMinutes ? "under" : "over"}
              </>
            ) : (
              <>&nbsp;</>
            )}
          </Text>
        </Stack>
      }
    />
  );
}
