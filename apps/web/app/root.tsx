import type {
  LoaderArgs,
  LinksFunction,
  V2_MetaFunction,
} from "@remix-run/cloudflare";
import * as Sentry from "@sentry/remix";

import { cssBundleHref } from "@remix-run/css-bundle";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { redirect, json } from "@remix-run/cloudflare";
import { User, createBrowserClient } from "@supabase/auth-helpers-remix";
import type { Database } from "@cadence/db";
import { SupabaseClient } from "@supabase/supabase-js";

import {
  MantineProvider,
  createEmotionCache,
  Title,
  Text,
  Container,
  Card,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { StylesPlaceholder } from "@mantine/remix";

import { APP_NAME, createServerClient } from "./util";

export const meta: V2_MetaFunction = () => [
  { charset: "utf-8" },
  { title: APP_NAME },
  { viewport: "width=device-width,initial-scale=1" },
];

createEmotionCache({ key: "mantine" });

export type SupabaseOutletContext = {
  supabase: SupabaseClient<Database>;
  user: User;
};

const PublicRoutes = ["/login", "/terms", "/privacy"];

export const loader = async ({ context, request }: LoaderArgs) => {
  Sentry.init({
    dsn: context.dsn as string | undefined,
    tracesSampleRate: 1,
    integrations: [],
  });

  const { response, supabase } = createServerClient(context, request);
  const env = {
    SUPABASE_URL: context.SUPABASE_URL as string,
    SUPABASE_ANON_KEY: context.SUPABASE_ANON_KEY as string,
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  if (!user && !PublicRoutes.some((r) => url.pathname.startsWith(r))) {
    return redirect("/login");
  }
  if (user && url.pathname === "/login") {
    return redirect("/");
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

export function ErrorBoundary() {
  const error = useRouteError();
  Sentry.captureException(error);
  let message;
  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    if (error.stack) {
      message = error.stack;
    } else {
      message = error.message;
    }
  } else if (typeof error === "string") {
    message = error;
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    message = error.message;
  } else {
    message = "Unknown error";
  }
  const colorScheme = useColorScheme();
  return (
    <MantineProvider theme={{ colorScheme }} withGlobalStyles withNormalizeCSS>
      <html lang="en">
        <head>
          <StylesPlaceholder />
          <Meta />
          <Links />
        </head>
        <body>
          <Container mt="xl">
            <Card>
              <Title mb="md">Something went wrong</Title>
              <Text>
                <pre>{message}</pre>
              </Text>
            </Card>
          </Container>
          <Scripts />
          <LiveReload />
        </body>
      </html>
    </MantineProvider>
  );
}

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export default function App() {
  const { env, session, user } = useLoaderData<typeof loader>();

  const colorScheme = useColorScheme();

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
    <MantineProvider theme={{ colorScheme }} withGlobalStyles withNormalizeCSS>
      <html lang="en">
        <head>
          <StylesPlaceholder />
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
    </MantineProvider>
  );
}
