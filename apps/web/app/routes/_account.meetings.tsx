/** @jsx jsx */
/** @jsxfrag */
import { useEffect } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import startOfWeek from "date-fns/startOfWeek";
import endOfWeek from "date-fns/endOfWeek";
import startOfMonth from "date-fns/startOfMonth";
import endOfMonth from "date-fns/endOfMonth";
import startOfDay from "date-fns/startOfDay";
import endOfDay from "date-fns/endOfDay";
import sub from "date-fns/sub";

import {
  useLoaderData,
  useOutletContext,
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
import { createServerClient, safeQuery, getAccountId } from "../util";

const HOURLY_WAGE = 50;

const costFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const getDateRange = (request: Request) => {
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  const timeframe = url.searchParams.get("timeframe") || "28d";
  const start = startParam ? new Date(startParam) : startOfDay(new Date());
  const end = endParam ? new Date(endParam) : endOfDay(new Date());

  switch (timeframe) {
    case "month":
      return [startOfMonth(end), endOfMonth(end)];
    case "week":
      return [startOfWeek(end), endOfWeek(end)];
    case "28d":
      return [startOfDay(sub(end, { days: 27 })), endOfDay(end)];
    default:
      return [start, end];
  }
};

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);
  const [start, end] = getDateRange(request);
  const during = `[${start.toISOString()}, ${end.toISOString()})`;

  const organizers = safeQuery(
    await supabase
      .rpc("event_by_organizer", { event_account_id: accountId, during })
      .order("length_sum", { ascending: false })
      .limit(10)
  );

  const lengths = safeQuery(
    await supabase
      .rpc("event_by_length", { event_account_id: accountId, during })
      .order("length_sum", { ascending: false })
      .limit(10)
  );

  let events = safeQuery(
    await supabase
      .rpc("event_series", { event_account_id: accountId, during })
      .order("length_sum", { ascending: false })
      .limit(30)
  );
  if (events?.length === 0) {
    const anyEvent = safeQuery(
      await supabase.from("event").select().eq("account_id", accountId).limit(1)
    );
    if (anyEvent?.length === 0) events = null;
  }

  return json(
    {
      accountId,
      organizers,
      lengths,
      events,
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
            {data.length === 0 && (
              <tr>
                <td colSpan={4}>None</td>
              </tr>
            )}
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td align="right">
                  <code>{row.meeting_count?.toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>{row.length_sum?.toLocaleString()}</code>
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

function MatchingMeetings({
  events,
}: {
  events: {
    series: string;
    title: string;
    length: number;
    invitee_count: number;
    attendee_count: number;
    length_sum: number;
    meeting_count: number;
    cost: number;
  }[];
}) {
  const [opened, { toggle }] = useDisclosure(false);
  return (
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
          {events?.length > 3 && (
            <ActionIcon onClick={toggle}>
              {opened ? <LayoutBottombarCollapse /> : <LayoutBottombarExpand />}
            </ActionIcon>
          )}
        </div>
        <Space h="0.5em" />

        <Table sx={{ tableLayout: "fixed" }}>
          <thead
            onClick={() => {
              events?.length > 3 ? toggle() : null;
            }}
          >
            <tr>
              <th css={{ width: "30em" }}>Meeting</th>
              <th css={{ width: "10em" }}>
                <Text ta="right">Length</Text>
              </th>
              <th css={{ width: "10em" }}>
                <Text ta="right">Invitees</Text>
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
            {events?.map((event, i: number) => (
              <tr
                key={event.series}
                css={{
                  display: i < 3 || opened ? "table-row" : "none",
                }}
              >
                <td>{event.title}</td>
                <td align="right">
                  <code>{Math.round(event.length)?.toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>
                    {event.invitee_count &&
                      (
                        Math.round(event.invitee_count * 10) / 10
                      ).toLocaleString()}
                  </code>
                </td>
                <td align="right">
                  <code>
                    {event.attendee_count &&
                      (
                        Math.round(event.attendee_count * 10) / 10
                      ).toLocaleString()}
                  </code>
                </td>
                <td align="right">
                  <code>{event.meeting_count?.toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>{event.length_sum?.toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>{costFmt.format((event.cost * HOURLY_WAGE) / 60)}</code>
                </td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Box>
    </Affix>
  );
}

export default function Meetings() {
  const { accountId, organizers, lengths, events } =
    useLoaderData<typeof loader>();

  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const revalidator = useRevalidator();

  useEffect(() => {
    const channel = supabase.channel(`account:${accountId}`);
    channel
      .on("broadcast", { event: "sync" }, () => {
        revalidator.revalidate();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, accountId]);

  return (
    <>
      <LoadingOverlay visible={events === null} zIndex={99} />
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
      {events && <MatchingMeetings events={events} />}
    </>
  );
}
