import { expect, test } from "@jest/globals";
import { CalendarStore } from "./";

const ACCOUNT_ID = 1;

test("fetches events", async () => {
  const store = new CalendarStore(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    process.env.OUTLOOK_CLIENT_ID!,
    process.env.OUTLOOK_OAUTH_SECRET!,
    ACCOUNT_ID
  );
  await store.loadCredentials();
  await store.getEvents();
});
