import type { LoaderArgs } from "@remix-run/cloudflare";

import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Title, Table } from "@mantine/core";

import { createServerClient, safeQuery } from "../util";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const accounts = safeQuery(
    await supabase
      .from("account")
      .select("id, name, email")
      .not("user_id", "is", null)
  );

  const eventCountResult = safeQuery(
    await supabase.rpc("event_count_by_account")
  );
  const eventCounts = eventCountResult
    ? Object.fromEntries(
        eventCountResult.map((row) => [row.account_id, row.event_count])
      )
    : {};

  return json({ accounts, eventCounts }, { headers: response.headers });
};

export default function Index() {
  const { accounts, eventCounts } = useLoaderData<typeof loader>();
  return (
    <>
      <Title>Admin</Title>
      <Table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {accounts?.map((account) => (
            <tr key={account.id.toString()}>
              <td>{account.email}</td>
              <td>{eventCounts?.[account.id]}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
