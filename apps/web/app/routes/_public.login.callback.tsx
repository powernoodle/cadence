import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";

import { createServerClient } from "@supabase/auth-helpers-remix";

import { Sentry } from "../sentry";
import { safeQuery } from "../util";

export const loader = async ({ context, request }: LoaderArgs) => {
  const response = new Response();

  try {
    const url = new URL(request.url);
    if (url.searchParams.has("error")) {
      if (url.searchParams.has("error_description")) {
        throw Error(url.searchParams.get("error_description") as string);
      } else {
        throw Error("Auth provider error");
      }
    }
    const code = url.searchParams.get("code");
    if (typeof code !== "string") throw Error("Missing auth code");

    const supabaseAdmin = createServerClient(
      context.SUPABASE_URL as string,
      context.SUPABASE_SERVICE_KEY as string,
      {
        request,
        response,
      }
    );
    const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(
      code
    );
    if (error) throw error;

    const credentials = {
      access_token: data?.session?.provider_token,
      refresh_token: data?.session?.provider_refresh_token,
    };
    if (!credentials.access_token || !credentials.refresh_token) {
      throw new Error("Missing credentials");
    }
    const provider =
      data?.session?.user?.app_metadata?.provider === "google"
        ? "google"
        : "azure";
    const email = data?.session?.user?.email?.toLowerCase();
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
    );

    const accountId = account?.[0]?.id;
    if (accountId) {
      // @ts-ignore
      await context.SYNC_QUEUE.send({ accountId });
    }

    return redirect("/meetings", {
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
    return redirect(`/login?${params.toString()}`, {
      status: 303,
      headers: response.headers,
    });
  }
};