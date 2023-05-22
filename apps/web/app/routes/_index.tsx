import type { LoaderArgs } from "@remix-run/cloudflare";

import { useLoaderData, useOutletContext } from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { useEffect, useState } from "react";
import { Container, Button } from "@mantine/core";

import type { Database } from "@cadence/db";
import { SupabaseOutletContext } from "../root";
import { createServerClient } from "../util";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const { data } = await supabase.from("posts").select();

  return json({ serverPosts: data ?? [] }, { headers: response.headers });
};

export default function Index() {
  const { serverPosts } = useLoaderData<typeof loader>();
  const [posts, setPosts] = useState(serverPosts);
  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const logout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    setPosts(serverPosts);
  }, [serverPosts]);

  useEffect(() => {
    const channel = supabase
      .channel("*")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => setPosts([...posts, payload.new as Post])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, posts, setPosts]);

  return (
    <Container p="sm">
      <Button onClick={logout}>Logout</Button>
    </Container>
  );
}
