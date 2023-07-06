import {
  Button,
  Container,
  Group,
  Image,
  List,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  createStyles,
  rem,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconAdjustments,
  IconPigMoney,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";

import hero from "../assets/hero.svg";
import { Target } from "../components/target";

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

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <Text
      span
      variant="gradient"
      gradient={{ from: "violet.5", to: "teal", deg: 45 }}
    >
      {children}
    </Text>
  );
}

export default function Index() {
  const { colorScheme } = useMantineColorScheme();
  const { classes } = useStyles();
  const [target, setTarget] = useState(16);

  return (
    <Stack>
      <Container size="xl">
        <div className={classes.inner}>
          <div className={classes.content}>
            <Title order={2} size="h1" className={classes.title} mb="xl">
              Success is <Highlight>more</Highlight> than meetings
            </Title>

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
                    <IconAdjustments size={rem(18)} stroke={1.5} />
                  </ThemeIcon>
                }
                sx={{ lineHeight: 1.55 }}
              >
                <b>Design your time</b> &#8212; Build a schedule with space to
                get the most from important meetings <b>and</b> deliver on the
                rest of your work.
              </List.Item>
              <List.Item
                icon={
                  <ThemeIcon size={32} radius="xl">
                    <IconPigMoney size={rem(18)} stroke={1.5} />
                  </ThemeIcon>
                }
                sx={{ lineHeight: 1.55 }}
              >
                <b>Set a meeting budget</b> &#8212; Reduce your meeting load,
                making time for what moves you forward.
              </List.Item>
              <List.Item
                icon={
                  <ThemeIcon size={32} radius="xl">
                    <IconTrendingUp size={rem(18)} stroke={1.5} />
                  </ThemeIcon>
                }
                sx={{ lineHeight: 1.55 }}
              >
                <b>Track your progress</b> &#8212; Learn where you're spending
                your time and which actions will align your calendar with your
                priorities.
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
      <Paper
        p="md"
        pt="xl"
        pb="xl"
        mt="xl"
        bg={colorScheme === "light" ? "gray.0" : "gray.9"}
      >
        <Container size="xl">
          <Stack>
            <Title order={3} size="h1">
              What is your <Highlight>ideal</Highlight> work week?
            </Title>
            <Target target={target} onChange={setTarget} />
            <Group mt="lg">
              <Button
                variant="outline"
                radius="xl"
                size="md"
                className={classes.control}
                component="a"
                href="/login"
              >
                Compare with your calendar
              </Button>
            </Group>
          </Stack>
        </Container>
      </Paper>
    </Stack>
  );
}
