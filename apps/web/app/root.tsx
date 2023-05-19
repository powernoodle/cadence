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
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { redirect, json } from "@remix-run/cloudflare"; // change this import to whatever runtime you are using
import {
  User,
  createBrowserClient,
  createServerClient,
} from "@supabase/auth-helpers-remix";
import type { Database } from "@cadence/db";
import { SupabaseClient } from "@supabase/supabase-js";

export type SupabaseOutletContext = {
  supabase: SupabaseClient<Database>;
  user: User;
};

export const loader = async ({ context, request }: LoaderArgs) => {
  const env = {
    SUPABASE_URL: context.SUPABASE_URL! as string,
    SUPABASE_ANON_KEY: context.SUPABASE_ANON_KEY! as string,
  };

  const response = new Response();

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    request,
    response,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  if (!user && !url.pathname.startsWith("/login")) {
    return redirect("/login");
  }

  return json(
    {
      env,
      session,
      user,
    },
    {
      headers: response.headers,
    }
  );
};

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export default function App() {
  const { env, session, user } = useLoaderData<typeof loader>();

  const { revalidate } = useRevalidator();

  const [supabase] = useState(() =>
    createBrowserClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      // @ts-ignore
      auth: { flowType: "pkce" },
    })
  );

  const serverAccessToken = session?.access_token;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "SIGNED_OUT":
          revalidate();
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serverAccessToken, supabase]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet context={{ supabase, session, user }} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
