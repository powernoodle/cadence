import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { useState } from "react";
import { Container, Flex, Button, Table, Select } from "@mantine/core";

import type { Database } from "@cadence/db";
import { SupabaseOutletContext } from "../root";
import { createServerClient, getAccountId } from "../util";

type Event = Database["public"]["Tables"]["event"]["Row"];
type Account = Database["public"]["Tables"]["account"]["Row"];

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const { data: accounts } = await supabase
    .from("account")
    .select("id, name, email")
    .not("user_id", "is", null);

  const url = new URL(request.url);
  const accountParam = url.searchParams.get("account");
  let accountId: number | null = null;
  if (accountParam) {
    accountId = parseInt(accountParam);
  }
  if (!accountId) {
    accountId = await getAccountId(supabase);
  }

  const { data: events } = await supabase
    .from("event")
    .select()
    .eq("account_id", accountId);

  return json(
    { accountId, accounts: accounts ?? [], events: events ?? [] },
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

export default function Index() {
  const [_, setSearchParams] = useSearchParams();
  const { accountId, accounts, events } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const accountSwitch = async (id: number) => {
    setSearchParams({ account: id.toString() });
  };

  return (
    <Container p="sm">
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="flex-start"
        direction="row"
        wrap="wrap"
      >
        <AccountSelect
          accounts={accounts}
          defaultValue={accountId || undefined}
          onChange={accountSwitch}
        />
        <Button onClick={logout}>Logout</Button>
      </Flex>
      <Table>
        <thead>
          <tr>
            <th>Title</th>
          </tr>
        </thead>

        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.title}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
