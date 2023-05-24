/** @jsx jsx */
/** @jsxfrag */
import { useEffect } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
  useRevalidator,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import {
  Card,
  Text,
  Box,
  Space,
  Grid,
  ActionIcon,
  Table,
  Affix,
  LoadingOverlay,
} from "@mantine/core";
import {
  LayoutBottombarExpand,
  LayoutBottombarCollapse,
} from "tabler-icons-react";
import { useDisclosure } from "@mantine/hooks";

import { SupabaseOutletContext } from "../root";
import { createServerClient, getAccountId } from "../util";

const HOURLY_WAGE = 50;

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const { data: organizers } = await supabase
    .from("organizer")
    .select()
    .eq("account_id", accountId)
    .order("length_sum", { ascending: false })
    .limit(10);

  const { data: lengths } = await supabase
    .from("event_length")
    .select()
    .eq("account_id", accountId)
    .order("length_sum", { ascending: false })
    .limit(10);

  const { data: events } = await supabase
    .from("event_series")
    .select()
    .eq("account_id", accountId)
    .order("length_sum", { ascending: false })
    .limit(30);

  return json(
    {
      accountId,
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
    length_sum: number;
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
    <Card shadow="xs" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Table>
          <thead>
            <tr>
              <th>{title}</th>
              <th>
                <Text ta="right">🧮</Text>
              </th>
              <th>
                <Text ta="right">⏳</Text>
              </th>
              <th>
                <Text ta="right">💰</Text>
              </th>
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
                  <code>{row.length_sum.toLocaleString()}</code>
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

export default function Meetings() {
  const [_, setSearchParams] = useSearchParams();
  const { accountId, organizers, lengths, events } =
    useLoaderData<typeof loader>();

  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const costFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const [opened, { toggle }] = useDisclosure(false);

  const revalidator = useRevalidator();

  useEffect(() => {
    const channel = supabase.channel(`account:${accountId}`);
    channel
      .on("broadcast", { event: "sync" }, (payload) => {
        console.log(payload);
        revalidator.revalidate();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, accountId]);

  return (
    <>
      <LoadingOverlay visible={events.length === 0} />
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
              id: o.length,
              ...o,
              title: o.length?.toLocaleString() || "?",
            }))}
          />
        </Grid.Col>
      </Grid>
      <Space h={200}></Space>
      <Affix position={{ bottom: 0, left: 0, right: 0 }}>
        <Box
          sx={(theme) => ({
            backgroundColor:
              theme.colorScheme === "dark"
                ? theme.colors.dark[6]
                : theme.colors.gray[0],
            borderTopWidth: "1px",
            borderTopStyle: "solid",
            borderTopColor:
              theme.colorScheme === "dark"
                ? theme.colors.dark[3]
                : theme.colors.gray[3],
            boxShadow:
              "0 -0.0625rem 0.1875rem rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05) 0 -0.625rem 0.9375rem -0.3125rem, rgba(0, 0, 0, 0.04) 0 0.4375rem 0.4375rem -0.3125rem",
            maxHeight: "50vh",
            overflow: "auto",
          })}
        >
          <div
            css={{
              position: "absolute",
              top: "0.5em",
              right: "0.5em",
            }}
          >
            <ActionIcon onClick={toggle}>
              {opened ? <LayoutBottombarCollapse /> : <LayoutBottombarExpand />}
            </ActionIcon>
          </div>
          <Space h="0.5em" />

          <Table sx={{ tableLayout: "fixed" }}>
            <thead onClick={toggle}>
              <tr>
                <th css={{ width: "30em" }}>Meeting</th>
                <th css={{ width: "10em" }}>
                  <Text ta="right">Length</Text>
                </th>
                <th css={{ width: "10em" }}>
                  <Text ta="right">Attendees</Text>
                </th>
                <th css={{ width: "10em" }}>
                  <Text ta="right">🧮</Text>
                </th>
                <th css={{ width: "10em" }}>
                  <Text ta="right">⏳</Text>
                </th>
                <th css={{ width: "10em" }}>
                  <Text ta="right">💰</Text>
                </th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {events.map((event, i) => (
                <tr
                  key={event.series}
                  css={{
                    display: i < 3 || opened ? "table-row" : "none",
                  }}
                >
                  <td>{event.title}</td>
                  <td align="right">
                    <code>{Math.round(event.length).toLocaleString()}</code>
                  </td>
                  <td align="right">
                    <code>
                      {Math.round(event.attendee_count).toLocaleString()}
                    </code>
                  </td>
                  <td align="right">
                    <code>{event.meeting_count.toLocaleString()}</code>
                  </td>
                  <td align="right">
                    <code>{event.length_sum.toLocaleString()}</code>
                  </td>
                  <td align="right">
                    <code>
                      {costFmt.format((event.cost * HOURLY_WAGE) / 60)}
                    </code>
                  </td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      </Affix>
    </>
  );
}
