import * as ClientSentry from "@sentry/remix";
import { useLocation, useMatches } from "@remix-run/react";
import { useEffect } from "react";

import { Toucan } from "toucan-js";
import { RewriteFrames } from "@sentry/integrations";

import { VERSION } from "./version";

export const SENTRY_DSN: string | undefined =
  "https://5d95ce1a49ab4eb1956c0d5a15f55960@o4505134083997696.ingest.sentry.io/4505134085832704";

// Only defined on the server after calling ServerInit()
let ServerSentry: any;

export const SentrySeverInit = () => {
  ServerSentry = new Toucan({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: VERSION,
    dist: "server",
    integrations: [
      // @ts-ignore
      new RewriteFrames({
        iteratee: (frame) => {
          frame.abs_path = "[[path]].js";
          return frame;
        },
      }),
    ],
  });
};

export const SentryClientInit = () => {
  ClientSentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: VERSION,
    dist: "browser",
    integrations: [
      new ClientSentry.BrowserTracing({
        // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
        tracePropagationTargets: [
          "localhost",
          /^https:\/\/[^/]*\.supabase\.io\//,
        ],
        routingInstrumentation: ClientSentry.remixRouterInstrumentation(
          useEffect,
          useLocation,
          useMatches
        ),
      }),
      // Replay is only available in the client
      new ClientSentry.Replay(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
};

export const Sentry = () => {
  if (ServerSentry) {
    return ServerSentry;
  } else {
    return ClientSentry;
  }
};
