import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createServerClient } from "@supabase/auth-helpers-remix";

import { Sentry } from "../sentry";
import { safeQuery, cookieOptions } from "../util";
import { getSession } from "../auth";

export const loader = async ({ context, request }: LoaderArgs) => {
  const response = new Response();

  try {
    const supabaseAdmin = createServerClient(
      context.SUPABASE_URL as string,
      context.SUPABASE_SERVICE_KEY as string,
      {
        request,
        response,
        cookieOptions,
      }
    );
    const session = await getSession(request, supabaseAdmin);
    const credentials = {
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token,
    };
    if (!credentials.access_token || !credentials.refresh_token) {
      throw new Error("Missing credentials");
    }
    const provider =
      session.user?.app_metadata?.provider === "google" ? "google" : "azure";
    const email = session.user?.email?.toLowerCase();
    if (!email) {
      throw new Error("Missing email");
    }
    // While the same email address can be registered with both Google and Outlook,
    // only one functions as the primary calendar. So we simply assume whiever
    // provider they are signing in with represents their primary calendar.
    const account = safeQuery(
      await supabaseAdmin
        .from("account")
        .update({ provider, credentials })
        .eq("email", email)
        .select()
        .single()
    );
    const accountId = account?.id;
    console.log(`User ${accountId} signed in`);

    if (accountId && !account?.synced_at) {
      console.log(`Triggering sync for account ${accountId}`);
      await supabaseAdmin
        .from("account")
        .update({
          sync_progress: 0,
        })
        .eq("id", accountId);
      // @ts-ignore
      await context.SYNC_QUEUE?.send?.({ accountId });
    }
    // const cookies = response.headers
    //   .get("Set-Cookie")
    //   ?.split(", ")
    //   ?.map((c) => {
    //     if (c.match(/^sb-.*-auth-token=/)) {
    //       return c + "; HttpOnly";
    //     }
    //     return c;
    //   });
    // if (cookies) {
    //   response.headers.delete("Set-Cookie");
    //   for (const cookie of cookies) {
    //     response.headers.append("Set-Cookie", cookie);
    //   }
    // }

    return redirect("/sync", {
      status: 303,
      headers: response.headers,
    });
  } catch (error) {
    console.error(error);
    Sentry().captureException(error);
    const params = new URLSearchParams();
    params.append(
      "error",
      error instanceof Error ? error.message : "Unknown error"
    );
    return redirect(`/sync?${params.toString()}`, {
      status: 303,
      headers: response.headers,
    });
  }
};
