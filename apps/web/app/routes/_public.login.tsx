import { useOutletContext, useLocation, Link } from "@remix-run/react";
import { LoaderArgs, redirect } from "@remix-run/cloudflare";
import { SupabaseOutletContext } from "../root";
import { Container, Stack, Card, Text, Space, Alert } from "@mantine/core";
import {
  GoogleLoginButton,
  MicrosoftLoginButton,
} from "react-social-login-buttons";
import { IconAlertCircle } from "@tabler/icons-react";

import { createServerClient } from "../util";

import { signInWithAzure, signInWithGoogle } from "../auth";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { supabase } = createServerClient(context, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return redirect("/meetings");
  return null;
};

export default function Login() {
  const { supabase } = useOutletContext<SupabaseOutletContext>();
  const params = new URLSearchParams(useLocation().search);
  const googleLogin = async () => {
    await signInWithGoogle(supabase, `${location.origin}/login/callback`);
  };
  const azureLogin = async () => {
    await signInWithAzure(supabase, `${location.origin}/login/callback`);
  };

  return (
    <Container size="xs" p="sm">
      <Space h="lg" />
      <Stack>
        <Card>
          <Stack>
            <Text>Sign in with your work account to get started.</Text>
            <GoogleLoginButton onClick={googleLogin}>
              Sign in with Google
            </GoogleLoginButton>
            <MicrosoftLoginButton onClick={azureLogin}>
              Sign in with Microsoft
            </MicrosoftLoginButton>
            <Text>
              By continuing, you agree to Divvy's{" "}
              <Link to={`/terms`}>Terms of Service</Link> and{" "}
              <Link to={`/privacy`}>Privacy Policy</Link>
            </Text>
          </Stack>
        </Card>
        {params.has("error") && (
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Sign in failed"
            color="red"
          >
            <Text mt="md">{params.get("error")}</Text>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
