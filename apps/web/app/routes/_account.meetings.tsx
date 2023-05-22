import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Table } from "@mantine/core";

import type { Database } from "@cadence/db";
import { createServerClient, getAccountId } from "../util";

type Event = Database["public"]["Tables"]["event"]["Row"];

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const { data: events } = await supabase
    .from("event")
    .select()
    .eq("account_id", accountId);

  return json({ events: events ?? [] }, { headers: response.headers });
};

export default function Index() {
  const [_, setSearchParams] = useSearchParams();
  const { events } = useLoaderData<typeof loader>();

  return (
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
  );
}
