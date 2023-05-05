import type { LinksFunction } from "@remix-run/cloudflare";
import type { LoaderArgs } from "@remix-run/cloudflare"; // change this import to whatever runtime you are using

import { cssBundleHref } from "@remix-run/css-bundle";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/cloudflare"; // change this import to whatever runtime you are using
import { PostgrestError, createClient } from "@supabase/supabase-js";

export const loader = ({ context }: LoaderArgs) => {
  const env = {
    SUPABASE_URL: context.SUPABASE_URL!,
    SUPABASE_ANON_KEY: context.SUPABASE_ANON_KEY!,
  };

  return json({ env });
};

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export default function App() {
  const { env } = useLoaderData();

  const [supabase] = useState(() =>
    createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  );

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet context={{ supabase }} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
