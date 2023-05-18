import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";

import { createServerClient } from "@supabase/auth-helpers-remix";

export const loader = async ({ context, request }: LoaderArgs) => {
  const response = new Response();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (typeof code !== "string") return redirect("/login");

  const supabaseAdmin = createServerClient(
    context.SUPABASE_URL as string,
    context.SUPABASE_SERVICE_KEY as string,
    {
      request,
      response,
    }
  );
  const { data } = await supabaseAdmin.auth.exchangeCodeForSession(code);

  const credentials = {
    auth_token: data?.session?.provider_token,
    refresh_token: data?.session?.provider_refresh_token,
  };
  if (!credentials.auth_token || !credentials.refresh_token) {
    throw new Error("Missing credentials");
  }
  const provider =
    data?.session?.user?.app_metadata?.provider === "google"
      ? "google"
      : "azure";
  const email = data?.session?.user?.email;
  if (!email) {
    throw new Error("Missing email");
  }
  await supabaseAdmin
    .from("account")
    .update({ credentials })
    .eq("provider", provider)
    .eq("email", email);

  return redirect("/", {
    status: 303,
    headers: response.headers,
  });
};
