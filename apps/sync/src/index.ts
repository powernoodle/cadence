import { Toucan } from "toucan-js";

import add from "date-fns/add";
import sub from "date-fns/sub";

import { EventError } from "@divvy/cal";
import { CalendarStore } from "@divvy/cal-store";

export type SyncRequest = {
  accountId: number;
};

export interface Env {
  readonly ENV?: string;

  readonly RELEASE?: string;
  readonly DB_URL: string;
  readonly SENTRY_DSN: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_OAUTH_SECRET: string;
  readonly MICROSOFT_CLIENT_ID: string;
  readonly MICROSOFT_OAUTH_SECRET: string;

  readonly QUEUE: Queue<SyncRequest>;
}

let Sentry: Toucan;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // if (env.ENV !== "development") {
      //   return new Response("Denied");
      // }
      if (request.method !== "POST") return new Response("Ignored");
      const body = await request.json();
      const accountId = (body as any)?.accountId;
      if (typeof accountId !== "number") {
        return new Response("Missing accountId");
      }
      const sync = (body as any)?.sync;
      if (sync) {
        await process(env, body as SyncRequest);
      } else {
        await env.QUEUE.send({ accountId });
      }
      return new Response("Success");
    } catch (e) {
      console.error(e);

      let error: object = { message: "Unknown error" };
      if (e instanceof Error) {
        error = {
          message: e.message,
          stack: e.stack,
          cause: e,
        };
      } else if (typeof e === "string" || e instanceof String) {
        error = {
          message: e,
        };
      }
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
      });
    }
  },

  // Invoked when the Worker receives a batch of messages.
  async queue(batch: MessageBatch<SyncRequest>, env: Env) {
    Sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      environment: env.ENV,
      release: env.RELEASE,
      dist: "sync",
    });
    try {
      await Promise.all(
        batch.messages.map(async (msg) => {
          try {
            if (typeof msg.body.accountId === "number") {
              console.log(`Sync starting (${msg.body.accountId})`);
              Sentry?.setUser({ id: msg.body.accountId.toString() });
              await process(env, msg.body);
              console.log(`Sync complete (${msg.body.accountId})`);
            } else {
              console.error("No accountId");
              console.log(msg.body);
              throw new Error("No accountId");
            }
            msg.ack();
          } catch (e) {
            console.error(`Sync failed (${msg.body.accountId})`);
            console.error(e);
            Sentry?.captureException(e);
            msg.ack();
          }
        })
      );
    } catch (e) {
      console.error(e);
      Sentry?.captureException(e);
      batch.retryAll();
    }
  },
};

async function process(env: Env, request: SyncRequest) {
  const missing = [
    "DB_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_OAUTH_SECRET",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_OAUTH_SECRET",
  ].filter((e) => !(e in env));
  if (missing.length) {
    throw new Error("Missing env vars: " + missing.join(", "));
  }
  const store = await CalendarStore.Create(
    env.DB_URL,
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_OAUTH_SECRET,
    env.MICROSOFT_CLIENT_ID,
    env.MICROSOFT_OAUTH_SECRET,
    request.accountId
  );

  await store.syncEvents(
    sub(new Date(), { days: 60 }),
    add(new Date(), { days: 30 }),
    "primary",
    (e) => {
      console.error(e);
      Sentry?.withScope((scope) => {
        if (e instanceof EventError) {
          scope.setExtra("event", e.event);
        }
        if (e.cause?.detail) {
          console.log(e.cause.detail);
          scope.setExtra("detail", e.cause.detail);
        }
        Sentry?.captureException(e);
      });
    }
  );

  await store.close();
}
