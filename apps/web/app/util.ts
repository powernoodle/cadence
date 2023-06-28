import { SupabaseClient } from "@supabase/supabase-js";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createServerClient as createSupabaseClient } from "@supabase/auth-helpers-remix";

import type { Database } from "@divvy/db";
export { safeQuery } from "@divvy/db";
import { safeQuery } from "./util";

export const APP_NAME = "Divvy";

export const makeTitle = (pageTitle: string) => `${pageTitle} | ${APP_NAME}`;

export const createServerClient = (
  context: AppLoadContext,
  request: Request
) => {
  const response = new Response();
  const supabase = createSupabaseClient<Database>(
    context.SUPABASE_URL as string,
    context.SUPABASE_ANON_KEY as string,
    {
      request,
      response,
    }
  );
  return { response, supabase };
};

export const getAccountId = async (
  request: Request,
  supabase: SupabaseClient
): Promise<number> => {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    console.error("No session");
    throw redirect("/login");
  }

  const url = new URL(request.url);
  const accountParam = url.searchParams.get("account");
  if (accountParam) {
    const isAdmin = safeQuery(await supabase.rpc("is_admin"));
    if (!isAdmin) throw redirect("/login");
    return parseInt(accountParam);
  }

  const userId = session.user?.id;
  if (!userId) {
    console.log("No user on session");
    throw redirect("/login");
  }
  const { data } = await supabase
    .from("account")
    .select()
    .eq("user_id", userId);
  const id = data?.[0]?.id;
  if (!id) {
    console.error(`No account found for ${userId}`);
    throw redirect("/login");
  }
  return id;
};

export const costFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const durationFmt = (length: number) => {
  const hours = Math.floor(length / 60);
  const minutes = length % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
};
