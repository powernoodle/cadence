/** @jsxfrag */
import React, { useEffect, PropsWithChildren } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import { isSameDay, toDate, formatDate } from "../tz";

import {
  useLoaderData,
  useOutletContext,
  useRevalidator,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Paper, Text, Table, ScrollArea, LoadingOverlay } from "@mantine/core";

import { SupabaseOutletContext } from "../root";
import {
  createServerClient,
  safeQuery,
  getAccountId,
  durationFmt,
} from "../util";
import { getDateRange, USER_TZ } from "./_account";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const [current] = getDateRange(new URL(request.url).searchParams);
  const during = `[${current[0].toISOString()}, ${current[1].toISOString()})`;

  let events = safeQuery(
    await supabase
      .from("event_stats")
      .select()
      .eq("account_id", accountId)
      .overlaps("at", during)
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
  return formatDate(start, USER_TZ, "cccc, MMMM d, yyyy");
};

const fmtTime = (start: Date, end: Date) => {
  return `${formatDate(start, USER_TZ, "h:mm aaa")} - ${formatDate(
    end,
    USER_TZ,
    "h:mm aaa"
  )}`;
};

function Meetings({
  events,
}: {
  events: {
    id: number;
    title: string;
    length: number;
    at: string;
    is_meeting: boolean;
    invitee_count: number;
    attendee_count: number;
  }[];
}) {
  let last: Date | undefined;
  return (
    <Paper>
      <ScrollArea>
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
                <td colSpan={5}>None</td>
              </tr>
            )}
            {events.map((row) => {
              const dates = row.at.replaceAll(/["\[\]]/g, "").split(",");
              const start = toDate(dates[0], USER_TZ);
              const end = toDate(dates[1], USER_TZ);
              const isNewDay = !last || !isSameDay(last, start, USER_TZ);
              last = start;
              const StyledText = ({ children }: PropsWithChildren<{}>) => (
                <Text
                  fw={row.is_meeting ? 700 : 300}
                  c={row.is_meeting ? "blue" : ""}
                >
                  {children}
                </Text>
              );
              return (
                <React.Fragment key={row.id}>
                  {isNewDay && (
                    <tr>
                      <td colSpan={5}>
                        <Text fs="italic">{fmtDate(start, end)}</Text>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ minWidth: "7em" }}>
                      <StyledText>{fmtTime(start, end)}</StyledText>
                    </td>
                    <td>
                      <StyledText>{row.title}</StyledText>
                    </td>
                    <td align="right">
                      <StyledText>
                        <code>{durationFmt(row.length || 0)}</code>
                      </StyledText>
                    </td>
                    <td align="right">
                      <StyledText>
                        <code>{(row.invitee_count || 0).toLocaleString()}</code>
                      </StyledText>
                    </td>
                    <td align="right">
                      <StyledText>
                        <code>
                          {(row.attendee_count || 0).toLocaleString()}
                        </code>
                      </StyledText>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      </ScrollArea>
    </Paper>
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
