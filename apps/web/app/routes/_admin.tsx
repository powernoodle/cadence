import { useState } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import { useOutletContext, Outlet, Link } from "@remix-run/react";
import { redirect, json } from "@remix-run/cloudflare";
import {
  AppShell,
  Burger,
  MediaQuery,
  Navbar,
  NavLink,
  useMantineTheme,
} from "@mantine/core";

import { SupabaseOutletContext } from "../root";
import { createServerClient, safeQuery } from "../util";
import Header from "../components/header";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const isAdmin = safeQuery(await supabase.rpc("is_admin"));
  if (!isAdmin) throw redirect("/login");

  return json({}, { headers: response.headers });
};

function AppNavbar({ opened }: { opened: boolean }) {
  return (
    <Navbar
      p="md"
      hiddenBreakpoint="sm"
      hidden={!opened}
      width={{ sm: 200, lg: 300 }}
    >
      <Navbar.Section>
        <NavLink label="Back to Dashboard" component={Link} to={`/meetings`} />
      </Navbar.Section>
    </Navbar>
  );
}

export default function Index() {
  const ctx = useOutletContext<SupabaseOutletContext>();
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  return (
    <AppShell
      styles={{
        main: {
          background:
            theme.colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
        },
      }}
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={<AppNavbar opened={opened} />}
      header={
        <Header
          menu={
            <MediaQuery largerThan="sm" styles={{ display: "none" }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                color={theme.colors.gray[6]}
                mr="xl"
              />
            </MediaQuery>
          }
        />
      }
    >
      <Outlet context={ctx} />
    </AppShell>
  );
}
