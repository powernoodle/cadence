import { Stack, Group, SimpleGrid, Text } from "@mantine/core";

import { EditGauge } from "./gauge";

const TOTAL_MINUTES = 40 * 60;

export function Targets({
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
      <Group>
        <Group spacing="xs">
          <Text>Weekly working hours:</Text>
          <Text color="white" fw={500}>
            {workingMinutes / 60}
          </Text>
        </Group>
        <Group spacing="xs">
          <Text>Meeting load:</Text>
          <Text color="white" fw={500}>
            {Math.round((meetingMinutes / workingMinutes) * 100)}%
          </Text>
        </Group>
      </Group>
      <SimpleGrid
        cols={4}
        breakpoints={[
          { maxWidth: "xs", cols: 1, spacing: "sm" },
          { maxWidth: "md", cols: 2, spacing: "sm" },
        ]}
      >
        <EditGauge
          title="Project Meetings"
          color="orange"
          totalMinutes={TOTAL_MINUTES}
          targetMinutes={targets?.project}
          onChange={(value) => onChange("project", value)}
        />
        <EditGauge
          title="Customer Meetings"
          color="orange"
          totalMinutes={TOTAL_MINUTES}
          targetMinutes={targets?.customer}
          onChange={(value) => onChange("customer", value)}
        />
        <EditGauge
          title="Management Meetings"
          color="orange"
          totalMinutes={TOTAL_MINUTES}
          targetMinutes={targets?.management}
          onChange={(value) => onChange("management", value)}
        />
        <EditGauge
          title="Everything Else"
          color="violet"
          totalMinutes={TOTAL_MINUTES}
          targetMinutes={targets?.everything}
          onChange={(value) => onChange("everything", value)}
        />
      </SimpleGrid>
    </Stack>
  );
}
