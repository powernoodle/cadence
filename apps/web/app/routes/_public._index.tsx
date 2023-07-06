import { useState, useCallback } from "react";
import {
  createStyles,
  Image,
  Container,
  Stack,
  Paper,
  Title,
  Button,
  Group,
  Text,
  List,
  ThemeIcon,
  rem,
  useMantineColorScheme,
} from "@mantine/core";
import { IconRulerMeasure, IconAdjustmentsFilled } from "@tabler/icons-react";
import hero from "../assets/hero.svg";
import { Targets } from "../components/targets";

const useStyles = createStyles((theme) => ({
  inner: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },

  content: {
    maxWidth: rem(480),
    marginRight: `calc(${theme.spacing.xl} * 3)`,

    [theme.fn.smallerThan("md")]: {
      maxWidth: "100%",
      marginRight: 0,
    },
  },

  title: {
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontSize: rem(44),
    lineHeight: 1.2,
    fontWeight: 900,

    [theme.fn.smallerThan("xs")]: {
      fontSize: rem(28),
    },
  },

  copy: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.gray[2]
        : theme.colors.gray[7],
  },

  control: {
    [theme.fn.smallerThan("xs")]: {
      flex: 1,
    },
  },

  image: {
    flex: 1,

    [theme.fn.smallerThan("md")]: {
      display: "none",
    },
  },

  highlight: {
    position: "relative",
    backgroundColor: theme.fn.variant({
      variant: "light",
      color: theme.primaryColor,
    }).background,
    borderRadius: theme.radius.sm,
    padding: `${rem(4)} ${rem(12)}`,
  },
}));

export default function Index() {
  const { colorScheme } = useMantineColorScheme();
  const { classes } = useStyles();
  const [targets, setTargets] = useState({
    project: 6 * 60,
    management: 2 * 60,
    customer: 60,
    everything: 20 * 60,
  });

  const onTargetsChange = useCallback((target: string, value: number) => {
    setTargets((targets) => ({ ...targets, [target]: value }));
  }, []);

  return (
    <Stack>
      <Container size="xl">
        <div className={classes.inner}>
          <div className={classes.content}>
            <Title order={2} size="h1" className={classes.title} mb="xl">
              Rule your calendar
            </Title>
            <Text mt="md" sx={{ lineHeight: 1.55 }} className={classes.copy}>
              Reduce your meeting load, making time for what moves you forward.
            </Text>

            <List
              mt={24}
              spacing="xl"
              size="md"
              center
              className={classes.copy}
            >
              <List.Item
                icon={
                  <ThemeIcon size={32} radius="xl">
                    <IconRulerMeasure size={rem(18)} stroke={1.5} />
                  </ThemeIcon>
                }
                sx={{ lineHeight: 1.55 }}
              >
                <b>Understand your time</b> &#8212; Learn from your calendar
                with a dynamic snapshot of where you're spending your time.
              </List.Item>
              <List.Item
                icon={
                  <ThemeIcon size={32} radius="xl">
                    <IconAdjustmentsFilled size={rem(18)} stroke={1.5} />
                  </ThemeIcon>
                }
                sx={{ lineHeight: 1.55 }}
              >
                <b>Trim unnecessary meetings</b> &#8212; Set and keep goals to
                reduce time in low-value meetings and make time for activities
                that advance your priorities
              </List.Item>
            </List>

            <Group mt={32}>
              <Button
                radius="xl"
                size="md"
                className={classes.control}
                component="a"
                href="/login"
              >
                Get started
              </Button>
            </Group>
          </div>
          <Image src={hero} className={classes.image} />
        </div>
      </Container>
      <Paper p="md" bg={colorScheme === "light" ? "gray.0" : "gray.9"}>
        <Container size="xl">
          <Stack>
            <Title order={3} size="h2" mt="xl">
              What is your ideal week?
            </Title>
            <Targets targets={targets} onChange={onTargetsChange} />
          </Stack>
        </Container>
      </Paper>
    </Stack>
  );
}
