import { createCookie } from "@remix-run/cloudflare";

export const userPrefs = createCookie("user-prefs", {
  theme: "light",
});
