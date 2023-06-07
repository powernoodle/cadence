import { RemixBrowser } from "@remix-run/react";
import { hydrateRoot } from "react-dom/client";
import { ClientProvider } from "@mantine/remix";

import { SentryClientInit } from "./sentry";

SentryClientInit();

hydrateRoot(
  document,
  <ClientProvider>
    <RemixBrowser />
  </ClientProvider>
);
