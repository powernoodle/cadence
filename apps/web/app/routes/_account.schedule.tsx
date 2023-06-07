/** @jsx jsx */
/** @jsxfrag */
import React, { useEffect } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import isSameDay from "date-fns/isSameDay";
import dateFormat from "date-fns/format";

import {
  useLoaderData,
  useOutletContext,
  useRevalidator,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Card, Text, Table, LoadingOverlay } from "@mantine/core";

import { SupabaseOutletContext } from "../root";
import { createServerClient, safeQuery, getAccountId } from "../util";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

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

const fmtDate = (start: Date, _end: Date) => {
  return dateFormat(start, "cccc, MMMM d, yyyy");
};

const fmtTime = (start: Date, end: Date) => {
  return `${dateFormat(start, "h:mm aaa")} - ${dateFormat(end, "h:mm aaa")}`;
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
  let last: Date | undefined;
  return (
    <Card shadow="xs" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Table>
          <thead>
            <tr>
              <th>Time</th>
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
            {events.map((row) => {
              const dates = row.at.replaceAll(/["\[\]]/g, "").split(",");
              const start = new Date(dates[0]);
              const end = new Date(dates[1]);
              const isNewDay = !last || !isSameDay(last, start);
              last = start;
              return (
                <React.Fragment key={row.id}>
                  {isNewDay && (
                    <tr>
                      <td colSpan={4}>
                        <Text c="dimmed">{fmtDate(start, end)}</Text>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>{fmtTime(start, end)}</td>
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
                </React.Fragment>
              );
            })}
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
