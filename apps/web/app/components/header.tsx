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
  Title,
} from "@mantine/core";

import { DEFAULT_PATH } from "../config";
import { APP_NAME } from "../util";
import { SupabaseOutletContext } from "../root";

export default function Header({ menu }: { menu?: ReactNode }) {
  const location = useLocation();
  const { supabase, user } = useOutletContext<SupabaseOutletContext>();
  const routes = useMatches();
  const isPublic = routes.some((r) => r.id === "routes/_public");

  const logout = async () => {
    await supabase.auth.signOut();
  };

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
        <Group>
          {user && isPublic && (
            <Button component={Link} to={DEFAULT_PATH}>
              Go to app
            </Button>
          )}
          {user && !isPublic && <Button onClick={logout}>Logout</Button>}
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
