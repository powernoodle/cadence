import { expect, test } from "@jest/globals";
import { CalendarStore } from "./";

test.only("fetches Google events", async () => {
  const store = await CalendarStore.Create(
    process.env.DB_URL!,
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    process.env.MICROSOFT_CLIENT_ID!,
    process.env.MICROSOFT_OAUTH_SECRET!,
    parseInt(process.env.GOOGLE_ACCOUNT_ID!)
  );
  await store.syncEvents(new Date("2023-06-05"), new Date("2023-06-24"));
});

test("fetches Outlook events", async () => {
  const store = await CalendarStore.Create(
    process.env.DB_URL!,
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    process.env.MICROSOFT_CLIENT_ID!,
    process.env.MICROSOFT_OAUTH_SECRET!,
    parseInt(process.env.OUTLOOK_ACCOUNT_ID!)
  );
  await store.syncEvents(new Date("2023-05-23"), new Date("2023-05-26"));
});
