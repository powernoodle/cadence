import React from "react";
import { useOutletContext } from "@remix-run/react";
import { SupabaseOutletContext } from "../root";
import { Container, Stack } from "@mantine/core";
import {
  GoogleLoginButton,
  MicrosoftLoginButton,
} from "react-social-login-buttons";

export default function Login() {
  const { supabase, user } = useOutletContext<SupabaseOutletContext>();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/login/callback`,
        scopes: [
          "https://www.googleapis.com/auth/calendar.events.readonly",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
  };

  async function signInWithAzure() {
    await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${location.origin}/login/callback`,
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
      {!user && (
        <Container size="xs" p="sm">
          <Stack>
            <GoogleLoginButton onClick={signInWithGoogle} />
            <MicrosoftLoginButton onClick={signInWithAzure} />
          </Stack>
        </Container>
      )}
      {user && <button onClick={logout}>Logout</button>}
    </>
  );
}
