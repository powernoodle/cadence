import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cadence/db";

import { CalendarClient, GoogleClient, OutlookClient } from "@cadence/cal";

export class CalendarStore {
  public static async Create(
    supabaseUrl: string,
    supabaseKey: string,
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string,
    accountId: number
  ) {
    const client = new CalendarStore(supabaseUrl, supabaseKey);
    await client.init(
      accountId,
      googleClientId,
      googleOauthSecret,
      outlookClientId,
      outlookOauthSecret
    );
    return client;
  }

  private supabase: SupabaseClient<Database>;
  private calendar?: CalendarClient;
  private constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  private async init(
    accountId: number,
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string
  ) {
    const { data, error } = await this.supabase
      .from("account")
      .select()
      .eq("id", accountId);
    if (error) throw error;
    if (!data[0].provider) {
      console.error(`Account ${accountId} missing provider`);
      throw Error("Missing provider");
    }
    console.dir(data[0].credentials);
    if (!data[0].credentials) {
      console.error(`Account ${accountId} missing refresh_token`);
      throw Error("Missing refresh token");
    }
    if (data[0].provider === "google") {
      this.calendar = new GoogleClient(
        googleClientId,
        googleOauthSecret,
        data[0].credentials,
        async (creds: any) => {}
      );
    } else {
      this.calendar = new OutlookClient(
        outlookClientId,
        outlookOauthSecret,
        data[0].credentials,
        async (creds: any) => {}
      );
    }
  }

  public async getEvents() {
    for await (const event of this.calendar!.getEvents(
      "primary",
      new Date("2023-05-15"),
      new Date("2023-05-16"),
      {}
    )) {
      console.dir(event);
      console.log(JSON.stringify(event.event.attendance));
    }
  }
}
