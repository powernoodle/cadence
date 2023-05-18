import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cadence/db";

import {
  CalendarClient,
  Credentials,
  GoogleClient,
  OutlookClient,
} from "@cadence/cal";

export class CalendarStore {
  private supabase: SupabaseClient<Database>;
  private calendar?: CalendarClient;

  public static async Create(
    supabaseUrl: string,
    supabaseKey: string,
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string,
    accountId: number
  ) {
    const client = new CalendarStore(supabaseUrl, supabaseKey, accountId);
    await client.init(
      googleClientId,
      googleOauthSecret,
      outlookClientId,
      outlookOauthSecret
    );
    return client;
  }

  private constructor(
    supabaseUrl: string,
    supabaseKey: string,
    public accountId: number
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  private async init(
    googleClientId: string,
    googleOauthSecret: string,
    outlookClientId: string,
    outlookOauthSecret: string
  ) {
    const { provider, access_token, refresh_token } =
      await this.loadCredentials();
    const credentials = { access_token, refresh_token };
    if (provider === "google") {
      this.calendar = new GoogleClient(
        googleClientId,
        googleOauthSecret,
        credentials,
        async (creds: any) => {
          await this.saveCredentials(creds);
        }
      );
    } else if (provider === "azure") {
      this.calendar = new OutlookClient(
        outlookClientId,
        outlookOauthSecret,
        credentials,
        async (creds: any) => {
          await this.saveCredentials(creds);
        }
      );
    } else {
      throw Error(`Unknown provider: ${provider}`);
    }
  }

  private loadCredentials = async () => {
    const { data, error } = await this.supabase
      .from("account")
      .select()
      .eq("id", this.accountId);
    if (error) throw error;
    if (!data?.length) {
      throw Error(`Account ${this.accountId} not found`);
    }
    const provider = data[0].provider;
    if (!provider) {
      console.error(`Account ${this.accountId} missing provider`);
      throw Error("Missing provider");
    }
    if (!data[0].credentials) {
      console.error(`Account ${this.accountId} missing credentials`);
      throw Error("Missing credentials");
    }
    const credentials = data[0].credentials as Credentials;
    const access_token = credentials.access_token as string | undefined;
    if (!access_token) {
      console.error(`Account ${this.accountId} missing access_token`);
      throw Error("Missing access token");
    }
    const refresh_token = credentials.refresh_token as string | undefined;
    if (!refresh_token) {
      console.error(`Account ${this.accountId} missing refresh_token`);
      throw Error("Missing refresh token");
    }
    return { provider, access_token, refresh_token };
  };

  private async saveCredentials(credentials: any) {
    if (!credentials?.access_token || !credentials?.refresh_token) {
      console.error("Missing tokens");
      return;
    }
    const { error } = await this.supabase
      .from("account")
      .update({ credentials })
      .eq("id", this.accountId);
    if (error) throw error;
  }

  public async getEvents() {
    if (!this.calendar) throw Error("Calendar not initialized");
    for await (const event of this.calendar.getEvents(
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
