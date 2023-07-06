import { Box, Stack, Group, SimpleGrid, Text, Slider } from "@mantine/core";

import { EditGauge } from "./gauge";

const TOTAL_MINUTES = 40 * 60;

export function Target({
  targets,
  onChange,
}: {
  targets: { [key: string]: number };
  onChange: (target: string, value: number) => void;
}) {
  const workingMinutes = Object.values(targets).reduce(
    (sum, value) => sum + value,
    0
  );
  const meetingMinutes = Object.entries(targets)
    .filter(([key]) => key !== "everything")
    .reduce((sum, [_, value]) => sum + value, 0);
  return (
    <Stack>
      <Slider
        color="orange"
        defaultValue={20}
        label={(value) => `${value} hours per week`}
        max={40}
        step={0.5}
        marks={[
          { value: 10, label: "10" },
          { value: 20, label: "20" },
          { value: 30, label: "30" },
          { value: 40, label: "40" },
        ]}
        styles={(theme) => ({
          track: { ":before": { backgroundColor: theme.colors.violet[7] } },
        })}
      />
      <Box></Box>
    </Stack>
  );
}
