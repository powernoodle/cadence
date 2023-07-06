import { Anchor, AppShell, Flex, Footer, Group, Text } from "@mantine/core";
import { Link, Outlet, useOutletContext } from "@remix-run/react";

import Header from "../components/header";
import { SupabaseOutletContext } from "../root";

function AppFooter() {
  return (
    <Footer
      height={60}
      p="md"
      sx={(theme) => ({
        [`@media (max-width: ${theme.breakpoints.sm})`]: {
          position: "relative",
        },
      })}
    >
      <Flex
        gap="md"
        justify="space-between"
        direction={{ base: "column", sm: "row" }}
      >
        <Group>
          <Anchor component={Link} to={`/terms`}>
            Terms of Service
          </Anchor>
          <Anchor component={Link} to={`/privacy`}>
            Privacy Policy
          </Anchor>
        </Group>
        <Group>
          <Text>Collide Solutions Inc.</Text>
          <Anchor href="mailto:team@divvy.day">Contact Us</Anchor>
        </Group>
      </Flex>
    </Footer>
  );
}

export default function Index() {
  const ctx = useOutletContext<SupabaseOutletContext>();
  return (
    <AppShell
      header={<Header />}
      footer={<AppFooter />}
      styles={{
        main: {
          minHeight: "unset",
          paddingLeft: 0,
          paddingRight: 0,
          paddingBottom: 60,
        },
      }}
    >
      <Outlet context={ctx} />
    </AppShell>
  );
}
