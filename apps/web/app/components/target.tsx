import {
  Box,
  Flex,
  Slider,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Fragment } from "react";
import { MEETING_ACTIVITIES, NON_MEETING_ACTIVITIES } from "~/activities";

import { makeColor } from "../color";

const WEEKLY_HOURS = 40;

function Activities({
  activities,
  color,
}: {
  activities: string[];
  color: string;
}) {
  const { colorScheme } = useMantineColorScheme();
  const isSm = useMediaQuery("(max-width: 768px)");
  return (
    <Text
      ta={isSm ? "inherit" : "justify"}
      lineClamp={isSm ? 8 : 4}
      fz={isSm ? "sm" : "md"}
    >
      {activities.map((activity, i) => (
        <Fragment key={i}>
          {i > 0 && <> &sdot; </>}
          <Text
            span
            color={makeColor(i % 2 ? color : "gray", 7, 5, colorScheme)}
          >
            {activity}
          </Text>
        </Fragment>
      ))}
    </Text>
  );
}

export function Target({
  target,
  onChange,
}: {
  target: number;
  onChange: (value: number) => void;
}) {
  return (
    <Stack>
      <Flex justify="space-between">
        <Text fz="xl" fw={700} color="orange">
          Meetings
        </Text>
        <Text fz="xl" fw={700} color="violet.5">
          Everything Else
        </Text>
      </Flex>
      <Slider
        color="orange"
        value={target}
        onChange={onChange}
        label={(value) => `${value} hours of meetings per week`}
        max={WEEKLY_HOURS}
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
      <Flex mt="md">
        <Box
          w={`${(target / WEEKLY_HOURS) * 100}%`}
          pr={{ base: "sm", lg: "md" }}
        >
          <Activities color="orange" activities={MEETING_ACTIVITIES} />
        </Box>
        <Box
          w={`${((WEEKLY_HOURS - target) / WEEKLY_HOURS) * 100}%`}
          pl={{ base: "sm", lg: "md" }}
          ta="right"
          sx={{ overflow: "hidden" }}
        >
          <Activities color="violet" activities={NON_MEETING_ACTIVITIES} />
        </Box>
      </Flex>
    </Stack>
  );
}
