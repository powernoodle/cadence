import { expect, test } from "@jest/globals";
import { GoogleClient } from "./google";

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
  for await (const { rawEvent } of client.getEvents(
    "primary",
    new Date("2023-05-15"),
    new Date("2023-05-16"),
    {}
  )) {
    const event = client.transform(rawEvent);
    console.dir(event);
    console.log(JSON.stringify(event?.attendance));
    expect(event).toBeDefined();
  }
});
