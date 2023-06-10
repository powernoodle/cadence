import { AppShell, Flex, Footer, Group, Text, MediaQuery } from "@mantine/core";
import { useOutletContext, Outlet, Link } from "@remix-run/react";
import Header from "../components/header";
import { SupabaseOutletContext } from "../root";

function AppFooter() {
  return (
    <Footer height={60} p="md">
      <Flex gap="md" justify="space-between" direction="row">
        <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
          <Group>
            <Text>Collide Solutions Inc.</Text>
          </Group>
        </MediaQuery>
        <Group>
          <Link to={`/terms`}>Terms of Service</Link>
          <Link to={`/privacy`}>Privacy Policy</Link>
        </Group>
      </Flex>
    </Footer>
  );
}

export default function Index() {
  const ctx = useOutletContext<SupabaseOutletContext>();
  return (
    <AppShell header={<Header />} footer={<AppFooter />}>
      <Outlet context={ctx} />
    </AppShell>
  );
}
