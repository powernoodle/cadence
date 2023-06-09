import { AppShell, Flex, Footer, Group, Text } from "@mantine/core";
import { useOutletContext, Outlet, Link } from "@remix-run/react";
import Header from "../components/header";

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
  const ctx = useOutletContext<SupabaseOutletContext>();
  return (
    <AppShell header={<Header />} footer={<AppFooter />}>
      <Outlet context={ctx} />
    </AppShell>
  );
}
