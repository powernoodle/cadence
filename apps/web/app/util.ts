import { SupabaseClient } from "@supabase/supabase-js";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { createServerClient as createSupabaseClient } from "@supabase/auth-helpers-remix";
import type { Database } from "@cadence/db";

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
  supabase: SupabaseClient
): Promise<number | null> => {
  const userId = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!userId) return null;
  const { data } = await supabase
    .from("account")
    .select()
    .eq("user_id", userId);
  if (!data) return null;
  return data[0]?.id;
};
