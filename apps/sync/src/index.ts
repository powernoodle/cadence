import { Toucan } from "toucan-js";

import add from "date-fns/add";
import sub from "date-fns/sub";

import { CalendarStore } from "@cadence/cal-store";

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

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext
  ): Promise<Response> {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      context,
      request,
    });

    try {
      if (env.ENV !== "dev") {
        return new Response("Denied");
      }
      if (request.method !== "POST") return new Response("Ignored");
      const body = await request.json();
      if (!body || typeof (body as any).accountId !== "number")
        return new Response("Missing accountId");
      await process(env, body as SyncRequest);
      return new Response("Success");
    } catch (e) {
      sentry.captureException(e);
      console.error(e);

      let error: object = { message: "Unknown error" };
      if (e instanceof Error) {
        error = {
          message: e.message,
          stack: e.stack,
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

async function process(env: Env, request: SyncRequest) {
  const store = await CalendarStore.Create(
    env.SUPABASE_URL!,
    env.SUPABASE_KEY!,
    env.GOOGLE_CLIENT_ID!,
    env.GOOGLE_OAUTH_SECRET!,
    env.MICROSOFT_CLIENT_ID!,
    env.MICROSOFT_OAUTH_SECRET!,
    request.accountId
  );
  await store.syncEvents(
    sub(new Date(), { days: 60 }),
    add(new Date(), { days: 30 })
  );
}
