/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import add from "date-fns/add";
import sub from "date-fns/sub";

import { CalendarStore } from "@cadence/cal-store";

export type SyncRequest = {
  accountId: number;
};

export interface Env {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_OAUTH_SECRET: string;
  readonly MICROSOFT_CLIENT_ID: string;
  readonly MICROSOFT_OAUTH_SECRET: string;

  readonly QUEUE: Queue<SyncRequest>;
}

export default {
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

async function process(env: Env, req: SyncRequest) {
  const store = await CalendarStore.Create(
    env.SUPABASE_URL!,
    env.SUPABASE_KEY!,
    env.GOOGLE_CLIENT_ID!,
    env.GOOGLE_OAUTH_SECRET!,
    env.MICROSOFT_CLIENT_ID!,
    env.MICROSOFT_OAUTH_SECRET!,
    req.accountId
  );
  await store.syncEvents(
    sub(new Date(), { days: 60 }),
    add(new Date(), { days: 30 })
  );
}
