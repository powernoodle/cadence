import {
  createStyles,
  AppShell,
  Flex,
  Footer,
  Image,
  Container,
  Title,
  Button,
  Group,
  Text,
  List,
  NavLink,
  ThemeIcon,
  rem,
} from "@mantine/core";
import { Link } from "@remix-run/react";
import { IconCheck } from "@tabler/icons-react";
import hero from "../assets/hero.svg";

const useStyles = createStyles((theme) => ({
  inner: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: `calc(${theme.spacing.xl} * 4)`,
    paddingBottom: `calc(${theme.spacing.xl} * 4)`,
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

function AppFooter() {
  return (
    <Footer height={60} p="md">
      <Flex gap="md" justify="space-between" direction="row">
        <Group>
          <Text>Collide Solutions Inc.</Text>
        </Group>
        <Group>
          <Link to={`/terms`}>Terms of Service</Link>
          <Link to={`/privacy`}>Privacy Policy</Link>
        </Group>
      </Flex>
    </Footer>
  );
}

export default function Index() {
  const { classes } = useStyles();
  return (
    <AppShell footer={<AppFooter />}>
      <Container>
        <div className={classes.inner}>
          <div className={classes.content}>
            <Title className={classes.title}>Control your calendar</Title>
            <Text color="dimmed" mt="md">
              Time is your most valuable asset, yet it's rarely measured. Divvy
              is an accountant for your time, helping you budget according to
              your priorities.
            </Text>

            <List
              mt={30}
              spacing="sm"
              size="sm"
              icon={
                <ThemeIcon size={20} radius="xl">
                  <IconCheck size={rem(12)} stroke={1.5} />
                </ThemeIcon>
              }
            >
              <List.Item>
                <b>Learn from your schedule</b> – dig into data-driven insights
                that highlight where you spend your time
              </List.Item>
              <List.Item>
                <b>Quick wins</b> – identify changes you can make, such as
                declining low-value meetings and reducing meeting length and
                frequency
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
    </AppShell>
  );
}
