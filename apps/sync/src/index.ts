import { Toucan } from "toucan-js";
import { createClient } from "@supabase/supabase-js";

import add from "date-fns/add";
import sub from "date-fns/sub";

import { EventError } from "@divvy/cal";
import { CalendarStore } from "@divvy/cal-store";

export type SyncRequest = {
  accountId: number;
};

export interface Env {
  readonly ENV?: string;

  readonly SENTRY_DSN: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_OAUTH_SECRET: string;
  readonly MICROSOFT_CLIENT_ID: string;
  readonly MICROSOFT_OAUTH_SECRET: string;

  readonly QUEUE: Queue<SyncRequest>;
}

let Sentry: Toucan;

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext
  ): Promise<Response> {
    Sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      environment: env.ENV,
      context,
      request,
    });

    try {
      if (env.ENV !== "development") {
        return new Response("Denied");
      }
      if (request.method !== "POST") return new Response("Ignored");
      const body = await request.json();
      const accountId = (body as any)?.accountId;
      if (typeof accountId !== "number") {
        return new Response("Missing accountId");
      }
      Sentry.setUser({ id: accountId.toString() });

      await process(env, body as SyncRequest);
      return new Response("Success");
    } catch (e) {
      console.error(e);
      Sentry.captureException(e);

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
    await Promise.all(
      batch.messages.map(async (msg) => {
        try {
          if (typeof msg.body.accountId === "number") {
            console.log(`Sync starting (${msg.body.accountId})`);
            await process(env, msg.body);
            console.log(`Sync complete (${msg.body.accountId})`);
          } else {
            console.error("No accountId");
            console.log(msg.body);
          }
          msg.ack();
        } catch (e) {
          console.error(`Sync failed (${msg.body.accountId})`);
          console.error(e);
          msg.retry();
        }
      })
    );
  },
};

class WebSocketProxy extends WebSocket {
  public constructor(url: string, protocols?: string | string[]) {
    super(url, protocols?.length ? protocols : undefined);
  }
}

async function process(env: Env, request: SyncRequest) {
  const store = await CalendarStore.Create(
    env.SUPABASE_URL,
    env.SUPABASE_KEY,
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
      Sentry.withScope((scope) => {
        if (e instanceof EventError) {
          scope.setExtra("event", e.event);
        }
        Sentry?.captureException(e);
      });
    }
  );

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    realtime: {
      transport: WebSocketProxy,
    },
  });
  const channel = client.channel(`account:${request.accountId}`);
  channel.subscribe(async (status: any, err: any) => {
    if (status === "SUBSCRIBED") {
      await channel.send({
        type: "broadcast",
        event: "sync",
        payload: { status: "DONE" },
      });
    }

    if (status === "CHANNEL_ERROR") {
      console.error(
        `There was an error subscribing to channel: ${err.message}`
      );
    }

    if (status === "TIMED_OUT") {
      console.error("Realtime server did not respond in time.");
    }

    if (status === "CLOSED") {
      console.error("Realtime channel was unexpectedly closed.");
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));
}
