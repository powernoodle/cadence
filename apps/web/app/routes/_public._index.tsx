import {
  createStyles,
  Image,
  Container,
  Title,
  Button,
  Group,
  Text,
  List,
  ThemeIcon,
  rem,
} from "@mantine/core";
import {
  IconRulerMeasure,
  IconAdjustmentsFilled,
  IconAd,
} from "@tabler/icons-react";
import hero from "../assets/hero.svg";

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
  const { classes } = useStyles();
  return (
    <Container>
      <div className={classes.inner}>
        <div className={classes.content}>
          <Title order={2} size="h1" className={classes.title} mb="xl">
            Rule your calendar
          </Title>
          <Text mt="md" sx={{ lineHeight: 1.55 }} className={classes.copy}>
            Every work day, too many things compete for your finite time. Hold
            back the barrage and make time for what moves you forward.
          </Text>

          <List
            mt={24}
            mb={24}
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
              <b>Measure what matters</b>
              <br />
              Learn from your calendar with a dynamic snapshot of where you're
              spending your time
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon size={32} radius="xl">
                  <IconAdjustmentsFilled size={rem(18)} stroke={1.5} />
                </ThemeIcon>
              }
              sx={{ lineHeight: 1.55 }}
            >
              <b>Align your time</b>
              <br />
              Set and keep goals to reduce time in low-value meetings and make
              time for activities that advance your priorities
            </List.Item>
          </List>

          <Group mt={30}>
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
  );
}
