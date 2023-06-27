import { ReactNode } from "react";
import {
  useOutletContext,
  useLocation,
  useMatches,
  Link,
} from "@remix-run/react";
import {
  Button,
  UnstyledButton,
  Flex,
  Group,
  Header as MantineHeader,
  useMantineColorScheme,
  ActionIcon,
  Title,
} from "@mantine/core";

import { DEFAULT_PATH } from "../config";
import { APP_NAME } from "../util";
import { SupabaseOutletContext } from "../root";

import { IconSun, IconMoonStars } from "@tabler/icons-react";

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <ActionIcon
      onClick={() => toggleColorScheme()}
      size="lg"
      sx={(theme) => ({
        backgroundColor:
          theme.colorScheme === "dark"
            ? theme.colors.dark[6]
            : theme.colors.gray[0],
        color:
          theme.colorScheme === "dark"
            ? theme.colors.yellow[4]
            : theme.colors.blue[6],
      })}
    >
      {colorScheme === "dark" ? (
        <IconSun size="1.2rem" />
      ) : (
        <IconMoonStars size="1.2rem" />
      )}
    </ActionIcon>
  );
}

export default function Header({ menu }: { menu?: ReactNode }) {
  const location = useLocation();
  const { user, headerControl } = useOutletContext<SupabaseOutletContext>();
  const routes = useMatches();
  const isPublic = routes.some((r) => r.id === "routes/_public");

  return (
    <MantineHeader height={60} p="xs">
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="flex-start"
        direction="row"
        wrap="wrap"
      >
        <Group>
          {menu}
          <UnstyledButton component={Link} to="/">
            <Title order={1} size="h2">
              {APP_NAME}
            </Title>
          </UnstyledButton>
        </Group>
        <Group>{headerControl}</Group>
        <Group>
          {user && !isPublic && <ThemeToggle />}
          {user && isPublic && (
            <Button component={Link} to={DEFAULT_PATH}>
              Go to app
            </Button>
          )}
          {!user && location.pathname !== "/login" && (
            <Button component={Link} to="/login">
              Sign in
            </Button>
          )}
        </Group>
      </Flex>
    </MantineHeader>
  );
}
