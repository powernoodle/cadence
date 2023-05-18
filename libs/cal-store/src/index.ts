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

  public constructor(
    supabaseUrl: string,
    supabaseKey: string,
    private googleClientId: string,
    private googleOauthSecret: string,
    private outlookClientId: string,
    private outlookOauthSecret: string,
    public accountId: number
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  private init(
    provider: "google" | "azure",
    access_token: string,
    refresh_token: string
  ) {
    const credentials = { access_token, refresh_token };
    if (provider === "google") {
      this.calendar = new GoogleClient(
        this.googleClientId,
        this.googleOauthSecret,
        credentials,
        async (creds: any) => {}
      );
    } else if (provider === "azure") {
      this.calendar = new OutlookClient(
        this.outlookClientId,
        this.outlookOauthSecret,
        credentials,
        async (creds: any) => {}
      );
    } else {
      throw Error(`Unknown provider: ${provider}`);
    }
  }

  public loadCredentials = async () => {
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
    this.init(provider, access_token, refresh_token);
  };

  public async saveCredentials(
    provider: "google" | "azure",
    access_token: string,
    refresh_token: string
  ) {
    const { error } = await this.supabase
      .from("account")
      .update({ provider, credentials: { access_token, refresh_token } })
      .eq("id", this.accountId);
    if (error) throw error;
    this.init(provider, access_token, refresh_token);
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
