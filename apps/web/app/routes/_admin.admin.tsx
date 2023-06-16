import { useEffect } from "react";
import type { LoaderArgs, ActionArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useRevalidator,
  Form,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Title, Table, Button } from "@mantine/core";
import { ClientOnly } from "remix-utils";
import { IconRefresh } from "@tabler/icons-react";

import { SupabaseOutletContext } from "../root";
import { createServerClient, safeQuery } from "../util";
import formatDate from "date-fns/format";
import differenceInSeconds from "date-fns/differenceInSeconds";

export async function action({ context, request }: ActionArgs) {
  const body = await request.formData();
  const accountId = body.get("resync");
  if (accountId) {
    // @ts-ignore
    await context.SYNC_QUEUE.send({ accountId });
  }
  return json("OK");
}

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const accounts = safeQuery(
    await supabase
      .from("account")
      .select(
        "id, name, email, synced_at, sync_progress, sync_started_at, synced_at"
      )
      .not("user_id", "is", null)
      .order("name")
      .order("email")
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
      <Form method="post">
        <Table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Status</th>
              <th>Sync Time</th>
              <th>Events</th>
              <th>Resync</th>
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
                <td>
                  {account.sync_started_at !== null
                    ? differenceInSeconds(
                        account.synced_at
                          ? new Date(account.synced_at)
                          : new Date(),
                        new Date(account.sync_started_at)
                      ) + "s"
                    : ""}
                </td>
                <td>{eventCounts?.[account.id]}</td>
                <td>
                  <Button
                    variant="outline"
                    compact
                    type="submit"
                    name="resync"
                    value={account.id}
                  >
                    <IconRefresh />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Form>
    </>
  );
}
