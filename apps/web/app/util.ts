import type { AppLoadContext } from "@remix-run/cloudflare";
import { createServerClient as createSupabaseClient } from "@supabase/auth-helpers-remix";
import type { Database } from "@cadence/db";

export const APP_NAME = "Pace";

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
