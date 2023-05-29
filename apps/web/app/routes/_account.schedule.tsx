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
import add from "date-fns/add";

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
import { differenceInDays } from "date-fns";

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
      return [
        [startOfMonth(end), endOfMonth(end)],
        [
          startOfMonth(sub(end, { months: 1 })),
          endOfMonth(sub(end, { months: 1 })),
        ],
        [
          startOfMonth(add(end, { months: 1 })),
          endOfMonth(add(end, { months: 1 })),
        ],
      ];
    case "week":
      return [
        [startOfWeek(end), endOfWeek(end)],
        [
          startOfWeek(sub(end, { weeks: 1 })),
          endOfWeek(sub(end, { weeks: 1 })),
        ],
        [
          startOfWeek(add(end, { weeks: 1 })),
          endOfWeek(add(end, { weeks: 1 })),
        ],
      ];
    case "28d":
      return [
        [startOfDay(sub(end, { days: 27 })), endOfDay(end)],
        [
          startOfDay(sub(end, { days: 27 + 28 })),
          endOfDay(sub(end, { days: 28 })),
        ],
        [startOfDay(add(end, { days: 1 })), endOfDay(add(end, { days: 28 }))],
      ];
    default:
      return [
        [start, end],
        [
          sub(start, { days: differenceInDays(start, end) }),
          sub(end, { days: differenceInDays(start, end) }),
        ],
        [
          add(start, { days: differenceInDays(start, end) }),
          add(end, { days: differenceInDays(start, end) }),
        ],
      ];
  }
};

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);
  const [current] = getDateRange(request);
  const during = `[${current[0].toISOString()}, ${current[1].toISOString()})`;

  let events = safeQuery(
    await supabase
      .from("event_stats")
      .select()
      .eq("account_id", accountId)
      .order("at")
  );

  return json(
    {
      accountId,
      events,
    },
    { headers: response.headers }
  );
};

function Meetings({
  events,
}: {
  events: {
    id: number;
    title: string;
    length: number;
    at: string;
    invitee_count: number;
    attendee_count: number;
  }[];
}) {
  return (
    <Card shadow="xs" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Table>
          <thead>
            <tr>
              <th></th>
              <th>Meeting</th>
              <th>
                <Text ta="right">Length</Text>
              </th>
              <th>
                <Text ta="right">Invitees</Text>
              </th>
              <th>
                <Text ta="right">Attendees</Text>
              </th>
            </tr>
          </thead>

          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={4}>None</td>
              </tr>
            )}
            {events.map((row) => (
              <tr key={row.id}>
                <td>{row.at}</td>
                <td>{row.title}</td>
                <td align="right">
                  <code>{(row.length || 0).toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>{(row.invitee_count || 0).toLocaleString()}</code>
                </td>
                <td align="right">
                  <code>{(row.attendee_count || 0).toLocaleString()}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Section>
    </Card>
  );
}

export default function Agenda() {
  const { accountId, events } = useLoaderData<typeof loader>();

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
      <Meetings
        // @ts-ignore
        events={events}
      />
    </>
  );
}
