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

const HOURLY_WAGE = 50;

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const { data: organizers } = await supabase
    .from("organizer")
    .select()
    .eq("account_id", accountId)
    .order("minutes_sum", { ascending: false })
    .limit(10);

  const { data: lengths } = await supabase
    .from("event_length")
    .select()
    .eq("account_id", accountId)
    .order("minutes_sum", { ascending: false })
    .limit(10);

  const { data: events } = await supabase
    .from("event")
    .select()
    .eq("account_id", accountId);

  return json(
    {
      organizers: organizers ?? [],
      lengths: lengths ?? [],
      events: events ?? [],
    },
    { headers: response.headers }
  );
};

function MeetingStats({
  title,
  data,
}: {
  title: string;
  data: {
    id: number;
    title: string;
    minutes_sum: number;
    meeting_count: number;
    cost: number;
  }[];
}) {
  const costFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Table>
          <thead>
            <tr>
              <th>{title}</th>
              <th css={{ textAlign: "right !important" }}>🧮</th>
              <th css={{ textAlign: "right !important" }}>⏳</th>
              <th css={{ textAlign: "right !important" }}>💰</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td align="right">
                  <code>{row.meeting_count.toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>{row.minutes_sum.toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>{costFmt.format((row.cost * HOURLY_WAGE) / 60)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Section>
    </Card>
  );
}

export default function Index() {
  const [_, setSearchParams] = useSearchParams();
  const { organizers, lengths, events } = useLoaderData<typeof loader>();

  return (
    <>
      <Grid columns={12}>
        <Grid.Col sm={12} md={6} lg={4}>
          <MeetingStats
            title="Organizer"
            // @ts-ignore
            data={organizers.map((o) => ({
              ...o,
              title: o.name || o.email || "Unknown",
            }))}
          />
        </Grid.Col>
        <Grid.Col sm={12} md={6} lg={4}>
          <MeetingStats
            title="Length (minutes)"
            // @ts-ignore
            data={lengths.map((o) => ({
              id: o.minutes,
              ...o,
              title: o.minutes.toLocaleString(),
            }))}
          />
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
