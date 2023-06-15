import { useEffect } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useRevalidator,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Title, Table } from "@mantine/core";
import { ClientOnly } from "remix-utils";

import { SupabaseOutletContext } from "../root";
import { createServerClient, safeQuery } from "../util";
import formatDate from "date-fns/format";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const accounts = safeQuery(
    await supabase
      .from("account")
      .select("id, name, email, synced_at, sync_progress")
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
  const { supabase } = useOutletContext<SupabaseOutletContext>();
  const { revalidate } = useRevalidator();

  useEffect(() => {
    const channel = supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "account",
        },
        (_) => revalidate()
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, revalidate]);

  return (
    <>
      <Title>Admin</Title>
      <Table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Status</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {accounts?.map((account) => (
            <tr key={account.id.toString()}>
              <td>
                {account.name} ({account.email})
              </td>
              <td>
                <ClientOnly>
                  {() => (
                    <>
                      {account.sync_progress !== null
                        ? "Syncing " +
                          Math.round(account.sync_progress * 100) +
                          "%"
                        : account.synced_at
                        ? "Synced at " +
                          formatDate(
                            new Date(account.synced_at),
                            "yyyy-MM-dd h:mm aaa"
                          )
                        : ""}
                    </>
                  )}
                </ClientOnly>
              </td>
              <td>{eventCounts?.[account.id]}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
