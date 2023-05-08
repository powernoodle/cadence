import { useOutletContext } from "@remix-run/react";
import { SupabaseOutletContext } from "../root";

export default function Login() {
  const { supabase, user } = useOutletContext<SupabaseOutletContext>();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
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
