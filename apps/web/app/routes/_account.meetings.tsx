/** @jsx jsx */
/** @jsxfrag */
import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Card, Grid, Table, Space } from "@mantine/core";
import { jsx, css } from "@emotion/react";

import type { Database } from "@cadence/db";
import { createServerClient, getAccountId } from "../util";

type Event = Database["public"]["Tables"]["event"]["Row"];

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const { data: organizers } = await supabase
    .from("organizer")
    .select()
    .eq("account_id", accountId);

  const { data: events } = await supabase
    .from("event")
    .select()
    .eq("account_id", accountId);

  return json(
    { organizers: organizers ?? [], events: events ?? [] },
    { headers: response.headers }
  );
};

export default function Index() {
  const [_, setSearchParams] = useSearchParams();
  const { organizers, events } = useLoaderData<typeof loader>();

  return (
    <>
      <Grid columns={12}>
        <Grid.Col sm={12} md={6} lg={4}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section>
              <Table>
                <thead>
                  <tr>
                    <th>Organizer</th>
                    <th css={{ textAlign: "right !important" }}>⏳</th>
                    <th css={{ textAlign: "right !important" }}>🧮</th>
                    <th css={{ textAlign: "right !important" }}>💰</th>
                  </tr>
                </thead>

                <tbody>
                  {organizers.map((organizer) => (
                    <tr key={organizer.id}>
                      <td>{organizer.name || organizer.email}</td>
                      <td align="right">
                        <code>{organizer.minutes.toLocaleString()}</code>
                      </td>
                      <td align="right">
                        <code>{organizer.meeting_count.toLocaleString()}</code>
                      </td>
                      <td align="right">
                        <code>{organizer.attendee_count.toLocaleString()}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Section>
          </Card>
        </Grid.Col>
      </Grid>
      <Space h="lg" />
      <Table>
        <thead>
          <tr>
            <th>Meeting</th>
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
    </>
  );
}
