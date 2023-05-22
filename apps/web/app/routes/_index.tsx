import type { LoaderArgs } from "@remix-run/cloudflare";

import { useLoaderData, useOutletContext } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { useEffect, useState } from "react";
import { Container, Button, Table } from "@mantine/core";

import type { Database } from "@cadence/db";
import { SupabaseOutletContext } from "../root";
import { createServerClient } from "../util";

type Event = Database["public"]["Tables"]["event"]["Row"];

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const { data } = await supabase.from("event").select();

  return json({ serverEvents: data ?? [] }, { headers: response.headers });
};

export default function Index() {
  const { serverEvents } = useLoaderData<typeof loader>();
  const [events, setEvents] = useState(serverEvents);
  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const logout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    setEvents(serverEvents);
  }, [serverEvents]);

  useEffect(() => {
    const channel = supabase
      .channel("*")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => setEvents([...events, payload.new as Event])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, events, setEvents]);

  return (
    <Container p="sm">
      <Button onClick={logout}>Logout</Button>
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
    </Container>
  );
}
