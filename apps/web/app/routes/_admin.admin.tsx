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

  return json({ accounts, headers: response.headers });
};

export default function Index() {
  const { accounts } = useLoaderData<typeof loader>();
  return (
    <>
      <Title>Admin</Title>
      <Table>
        <thead>
          <tr>
            <th>Account</th>
          </tr>
        </thead>
        <tbody>
          {accounts?.map((account) => (
            <tr key={account.id.toString()}>
              <td>{account.email}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
