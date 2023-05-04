import type { V2_MetaFunction } from "@remix-run/cloudflare";
import type { LoaderArgs } from "@remix-run/cloudflare"; // change this import to whatever runtime you are using

import { useEffect, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare"; // change this import to whatever runtime you are using
// import { createServerClient } from '@supabase/auth-helpers-remix'
import { PostgrestError, createClient } from "@supabase/supabase-js";

export const meta: V2_MetaFunction = () => {
  return [{ title: "New Remix App" }];
};

export const loader = ({ context }: LoaderArgs) => {
  const env = {
    SUPABASE_URL: context.SUPABASE_URL!,
    SUPABASE_ANON_KEY: context.SUPABASE_ANON_KEY!,
  };

  return json({ env });
};

export default function Index() {
  // const { env } = useLoaderData();
  //
  // const [supabase] = useState(() =>
  //   createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  // );

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Remix</h1>
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
    </div>
  );
}
