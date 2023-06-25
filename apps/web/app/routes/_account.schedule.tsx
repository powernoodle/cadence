/** @jsxfrag */
import React, { PropsWithChildren } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import { isSameDay, toDate, formatDate } from "@divvy/tz";

import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { Paper, Text, Table, ScrollArea } from "@mantine/core";

import {
  createServerClient,
  safeQuery,
  getAccountId,
  durationFmt,
} from "../util";
import { USER_TZ } from "../config";
import { getDateRange } from "./_account";

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
    type: string;
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
              const dates = row.at.replaceAll(/["\[\]()]/g, "").split(",");
              const start = toDate(dates[0], USER_TZ);
              const end = toDate(dates[1], USER_TZ);
              const isNewDay = !last || !isSameDay(last, start, USER_TZ);
              last = start;
              const StyledText = ({ children }: PropsWithChildren<{}>) => (
                <Text
                  fw={
                    row.type === "internal" || row.type === "external"
                      ? 700
                      : 300
                  }
                  c={
                    row.type === "internal" || row.type === "external"
                      ? "blue"
                      : ""
                  }
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
  const { events } = useLoaderData<typeof loader>();

  return (
    <>
      <Meetings
        // @ts-ignore
        events={events}
      />
    </>
  );
}
