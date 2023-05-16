import { expect, test } from "@jest/globals";
import { GoogleClient } from "./google";

test("fetches calendars", async () => {
  const client = new GoogleClient(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_SECRET!,
    {
      access_token: process.env.GOOGLE_ACCESS_TOKEN!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
    },
    async (creds: any) => {
      console.dir("New creds", creds);
    }
  );
  for await (const calendar of client.getCalendars()) {
    console.dir(calendar);
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
      console.dir("New creds", creds);
    }
  );
  for await (const event of client.getEvents(
    "primary",
    new Date("2023-05-15"),
    new Date("2023-05-16"),
    {}
  )) {
    console.dir(event);
    console.log(JSON.stringify(event.event.attendance));
    expect(event).toBeDefined();
  }
});
