import { expect, test } from "@jest/globals";
import { CalendarStore } from "./";

test("fetches Google events", async () => {
  const store = await CalendarStore.Create(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    process.env.MICROSOFT_CLIENT_ID!,
    process.env.MICROSOFT_OAUTH_SECRET!,
    parseInt(process.env.GOOGLE_ACCOUNT_ID!)
  );
  await store.getEvents();
});

test("fetches Outlook events", async () => {
  const store = await CalendarStore.Create(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    process.env.MICROSOFT_CLIENT_ID!,
    process.env.MICROSOFT_OAUTH_SECRET!,
    parseInt(process.env.OUTLOOK_ACCOUNT_ID!)
  );
  await store.getEvents();
});
