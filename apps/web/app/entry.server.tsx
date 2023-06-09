import { renderToString } from "react-dom/server";
import { RemixServer, isRouteErrorResponse } from "@remix-run/react";
import type { EntryContext, DataFunctionArgs } from "@remix-run/cloudflare";
import { injectStyles } from "@mantine/remix";
import { defaultMantineEmotionCache } from "@mantine/styles";
import { createEmotionServer } from "@divvy/emotion-server";
import { SentrySeverInit, Sentry } from "./sentry";

SentrySeverInit();

export function createStylesServer() {
  return createEmotionServer(defaultMantineEmotionCache);
}

const server = createStylesServer();

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  let markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );
  responseHeaders.set("Content-Type", "text/html");

  return new Response(`<!DOCTYPE html>${injectStyles(markup, server)}`, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}

export function handleError(
  error: unknown,
  { request, params, context }: DataFunctionArgs
): void {
  if (isRouteErrorResponse(error)) {
    console.error(`${error.status} ${error.statusText}`);
  } else if (error instanceof Error) {
    Sentry().captureException(error);
    console.error(error);
  } else {
    let unknownError = new Error("Unknown Server Error");
    Sentry().captureException(unknownError);
    console.error(unknownError);
  }
}
