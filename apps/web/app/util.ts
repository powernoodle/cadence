import { SupabaseClient } from "@supabase/supabase-js";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createServerClient as createSupabaseClient } from "@supabase/auth-helpers-remix";

import type { Database } from "@divvy/db";
export { safeQuery } from "@divvy/db";

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
  const url = new URL(request.url);
  const accountParam = url.searchParams.get("account");
  if (accountParam) {
    return parseInt(accountParam);
  }

  const userId = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!userId) throw redirect("/login");
  const { data } = await supabase
    .from("account")
    .select()
    .eq("user_id", userId);
  if (data) {
    return data[0]?.id;
  }
  console.error(`No account found for ${userId}`);
  throw redirect("/login");
};

export const costFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const durationFmt = (length: number, full: boolean = false) => {
  const hours = Math.floor(length / 60);
  const minutes = length % 60;
  let ret = "";
  if (hours) {
    ret = `${hours.toLocaleString()}h`;
  }
  if (full || minutes) {
    if (ret) ret += " ";
    ret += `${String(minutes).padStart(hours ? 2 : 1, "0")}m`;
  }
  return ret;
};
