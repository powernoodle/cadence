import type { LoaderArgs } from "@remix-run/cloudflare";

import { useOutletContext, Outlet } from "@remix-run/react";
import { redirect, json } from "@remix-run/cloudflare";

import { SupabaseOutletContext } from "../root";
import { createServerClient, safeQuery } from "../util";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);

  const isAdmin = safeQuery(await supabase.rpc("is_admin"));
  if (!isAdmin) throw redirect("/login");

  return json({}, { headers: response.headers });
};

export default function Index() {
  const ctx = useOutletContext<SupabaseOutletContext>();
  return <Outlet context={ctx} />;
}
