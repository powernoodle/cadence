import { useOutletContext } from "@remix-run/react";
import { SupabaseOutletContext } from "../root";

export default function Login() {
  const { supabase, user } = useOutletContext<SupabaseOutletContext>();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/login/callback`,
        scopes: [
          "https://www.googleapis.com/auth/calendar.readonly",
          "https://www.googleapis.com/auth/calendar.events.readonly",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "consent select_account",
        },
      },
    });
  };

  async function signInWithAzure() {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: [
          "openid",
          "email",
          "user.read",
          "calendars.read",
          "offline_access",
        ].join(" "),
      },
    });
  }

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {!user && <button onClick={signInWithGoogle}>Google Login</button>}
      {!user && <button onClick={signInWithAzure}>Outlook Login</button>}
      {user && <button onClick={logout}>Logout</button>}
    </>
  );
}
