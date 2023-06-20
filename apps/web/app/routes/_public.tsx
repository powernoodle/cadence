import { AppShell, Flex, Footer, Group, Text, MediaQuery } from "@mantine/core";
import { useOutletContext, Outlet, Link } from "@remix-run/react";
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
          <Link to={`/terms`}>Terms of Service</Link>
          <Link to={`/privacy`}>Privacy Policy</Link>
        </Group>
        <Group>
          <Text>Collide Solutions Inc.</Text>
          <a href="mailto:team@divvy.day">Contact Us</a>
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
