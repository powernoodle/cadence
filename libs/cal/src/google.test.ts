import { expect, test } from "@jest/globals";
import { GoogleClient } from "./google";

test.only("fetches calendars", async () => {
  const client = new GoogleClient(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    {
      access_token: process.env.GOOGLE_ACCESS_TOKEN!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
    },
    async (creds: any) => {
      console.log("New creds", creds);
    }
  );
  for await (const calendar of client.getCalendars()) {
    console.log(calendar);
    expect(calendar).toBeDefined();
  }
});

test("fetches events", async () => {
  const client = new GoogleClient(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    {
      access_token: process.env.GOOGLE_ACCESS_TOKEN!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
    },
    async (creds: any) => {
      console.log("New creds", creds);
    }
  );
  for await (const event of client.getEvents(
    "primary",
    new Date("2023-05-15"),
    new Date("2023-05-16"),
    {}
  )) {
    console.log(event);
    expect(event).toBeDefined();
  }
});
