import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";

import { createServerClient } from "@supabase/auth-helpers-remix";

export const loader = async ({ context, request }: LoaderArgs) => {
  const env = {
    SUPABASE_URL: context.SUPABASE_URL! as string,
    SUPABASE_ANON_KEY: context.SUPABASE_ANON_KEY! as string,
  };

  const response = new Response();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (typeof code !== "string") return redirect("/login");

  // exchange the auth code for user session
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    request,
    response,
  });
  const { data } = await supabase.auth.exchangeCodeForSession(code);

  console.log(data?.session?.provider_token);
  console.log(data?.session?.provider_refresh_token);

  return redirect("/", {
    status: 303,
    headers: response.headers,
  });
};
