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
  for await (const { rawEvent } of client.getEvents(
    "primary",
    new Date("2023-05-15"),
    new Date("2023-05-17"),
    {}
  )) {
    const event = client.transform(rawEvent);
    console.dir(event);
    console.log(JSON.stringify(event?.attendance));
    expect(event).toBeDefined();
  }
});
