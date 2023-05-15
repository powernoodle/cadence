import { useOutletContext } from "@remix-run/react";
import { SupabaseOutletContext } from "../root";

export default function Login() {
  const { supabase, user } = useOutletContext<SupabaseOutletContext>();

  const signInWithGoogle = async () => {
    const { data } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar.events.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent select_account",
        },
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {!user && <button onClick={signInWithGoogle}>Google Login</button>}
      {user && <button onClick={logout}>Logout</button>}
    </>
  );
}
