import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createServerClient } from "@supabase/auth-helpers-remix";

import { Sentry } from "../sentry";
import { getSession } from "../auth";
import { DEFAULT_PATH } from "../config";
import { cookieOptions } from "../util";

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
    const email = session.user?.email?.toLowerCase();
    if (!email) {
      throw new Error("Missing email");
    }
    return redirect(DEFAULT_PATH, {
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
