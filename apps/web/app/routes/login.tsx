import { useOutletContext, useLocation } from "@remix-run/react";
import { SupabaseOutletContext } from "../root";
import {
  Container,
  Stack,
  Card,
  Title,
  Text,
  Space,
  Alert,
} from "@mantine/core";
import {
  GoogleLoginButton,
  MicrosoftLoginButton,
} from "react-social-login-buttons";
import { AlertCircle } from "tabler-icons-react";

export default function Login() {
  const { supabase } = useOutletContext<SupabaseOutletContext>();
  const params = new URLSearchParams(useLocation().search);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/login/callback`,
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"].join(" "),
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

  return (
    <Container size="xs" p="sm">
      <Space h="lg" />
      <Card>
        <Title order={1}>Divvy</Title>
        <Text>How will you invest your day?</Text>
        <Space h="md" />
        <Stack>
          <GoogleLoginButton onClick={signInWithGoogle} />
          <MicrosoftLoginButton onClick={signInWithAzure} />
        </Stack>
      </Card>
      <Space h="md" />
      {params.has("error") && (
        <Alert
          icon={<AlertCircle size="1rem" />}
          title="Authorization failed"
          color="red"
        >
          <Text>Divvy was not granted access to your calendar.</Text>
          <Text mt="md">{params.get("error")}</Text>
        </Alert>
      )}
    </Container>
  );
}
