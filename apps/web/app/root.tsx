import type {
  LoaderArgs,
  LinksFunction,
  V2_MetaFunction,
} from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Sentry } from "./sentry";

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
  useFetcher,
} from "@remix-run/react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { User, createBrowserClient } from "@supabase/auth-helpers-remix";
import type { Database } from "@divvy/db";
import { SupabaseClient } from "@supabase/supabase-js";

import {
  MantineProvider,
  ColorSchemeProvider,
  ColorScheme,
  createEmotionCache,
  Title,
  Text,
  Container,
  Card,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { StylesPlaceholder } from "@mantine/remix";

import { APP_NAME, createServerClient, cookieOptions } from "./util";
import { userPrefs } from "~/cookies";

import { useOutletContext } from "@remix-run/react";

export const meta: V2_MetaFunction = () => [
  { charset: "utf-8" },
  { title: APP_NAME },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
];

createEmotionCache({ key: "mantine" });

export type SupabaseOutletContext = {
  supabase: SupabaseClient<Database>;
  user: User;
  syncProgress: number | null;
};

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const env = {
    SUPABASE_URL: context.SUPABASE_URL as string,
    SUPABASE_ANON_KEY: context.SUPABASE_ANON_KEY as string,
  };

  const cookieHeader = request.headers.get("Cookie");
  const prefs = (await userPrefs.parse(cookieHeader)) || {};

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return json(
    {
      env,
      session,
      user,
      prefs,
    },
    {
      headers: response.headers,
    }
  );
};

export function ErrorBoundary() {
  const error = useRouteError();
  if (!isRouteErrorResponse(error)) {
    Sentry().captureException(error);
  }
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
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-16x16.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
          <meta name="msapplication-TileColor" content="#da532c" />
          <meta name="theme-color" content="#ffffff" />
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
  const { env, session, user, prefs } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    prefs?.theme || systemColorScheme
  );
  useEffect(() => {
    if (!prefs?.theme) {
      toggleColorScheme(systemColorScheme);
    }
  }, [systemColorScheme]);
  const toggleColorScheme = (value?: ColorScheme) => {
    const nextColorScheme =
      value || (colorScheme === "dark" ? "light" : "dark");
    setColorScheme(nextColorScheme);
    fetcher.submit(
      { theme: nextColorScheme },
      { method: "post", action: "/prefs" }
    );
  };

  const { revalidate } = useRevalidator();

  const [supabase] = useState(() =>
    createBrowserClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      // @ts-ignore
      auth: { flowType: "pkce" },
      cookieOptions,
    })
  );

  const serverAccessToken = session?.access_token;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, _session) => {
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
    <ColorSchemeProvider
      colorScheme={colorScheme}
      toggleColorScheme={toggleColorScheme}
    >
      <MantineProvider
        theme={{ colorScheme }}
        withGlobalStyles
        withNormalizeCSS
      >
        <html lang="en">
          <head>
            <StylesPlaceholder />
            <Meta />
            <Links />
          </head>
          <body>
            <Outlet
              context={{
                supabase,
                session,
                user,
              }}
            />
            <ScrollRestoration />
            <Scripts />
            <LiveReload />
          </body>
        </html>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
