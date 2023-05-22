import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";

export const loader = async ({ context, request }: LoaderArgs) => {
  return redirect("/meetings");
};
