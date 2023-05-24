import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
  Outlet,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { useState } from "react";
import {
  AppShell,
  Header,
  Container,
  Flex,
  Title,
  Button,
  Select,
} from "@mantine/core";

import type { Database } from "@cadence/db";
import { SupabaseOutletContext } from "../root";
import { APP_NAME, createServerClient, getAccountId } from "../util";

type Account = Database["public"]["Tables"]["account"]["Row"];

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const { data: accounts } = await supabase
    .from("account")
    .select("id, name, email")
    .not("user_id", "is", null);

  return json(
    { accountId, accounts: accounts ?? [] },
    { headers: response.headers }
  );
};

function AccountSelect({
  accounts,
  defaultValue,
  onChange,
}: {
  accounts: Pick<Account, "id" | "name" | "email">[];
  defaultValue?: number;
  onChange: (id: number) => void;
}) {
  const [value, setValue] = useState<number | null>(defaultValue || null);
  const handleChange = (id: string) => {
    const idNum = parseInt(id);
    setValue(idNum);
    onChange(idNum);
  };
  return (
    <Select
      placeholder="Select account"
      w="20em"
      value={value?.toString()}
      onChange={handleChange}
      data={accounts.map((account) => ({
        value: account.id.toString(),
        label: account.name
          ? `${account.name} (${account.email})`
          : account.email,
      }))}
    />
  );
}

function AppHeader() {
  const { accountId, accounts } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const logout = async () => {
    await supabase.auth.signOut();
  };
  const [_, setSearchParams] = useSearchParams();
  const accountSwitch = async (id: number) => {
    setSearchParams({ account: id.toString() });
  };

  return (
    <Header height={60} p="xs">
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="flex-start"
        direction="row"
        wrap="wrap"
      >
        <Title order={1} size="h2">
          {APP_NAME}
        </Title>
        <AccountSelect
          accounts={accounts}
          defaultValue={accountId || undefined}
          onChange={accountSwitch}
        />
        <Button onClick={logout}>Logout</Button>
      </Flex>
    </Header>
  );
}

export default function Index() {
  const ctx = useOutletContext<SupabaseOutletContext>();
  return (
    <AppShell header={<AppHeader />}>
      <Outlet context={ctx} />
    </AppShell>
  );
}
