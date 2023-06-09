import { expect, test } from "@jest/globals";
import { OutlookClient } from "./outlook";

test.only("fetches events", async () => {
  const client = new OutlookClient(
    process.env.MICROSOFT_CLIENT_ID!,
    process.env.MICROSOFT_OAUTH_SECRET!,
    {
      access_token: process.env.MICROSOFT_ACCESS_TOKEN!,
      refresh_token: process.env.MICROSOFT_REFRESH_TOKEN!,
    },
    async (creds: any) => {
      console.dir("New creds", creds);
    }
  );
  for await (const event of client.getEvents(
    "primary",
    new Date("2023-05-15"),
    new Date("2023-05-17"),
    {}
  )) {
    console.dir(event);
    console.log(JSON.stringify(event.event?.attendance));
    expect(event).toBeDefined();
  }
});
