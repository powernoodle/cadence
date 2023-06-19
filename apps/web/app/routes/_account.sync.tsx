import { useEffect, useState } from "react";
import {
  useOutletContext,
  useLocation,
  useLoaderData,
  useRevalidator,
} from "@remix-run/react";
import { LoaderArgs, json } from "@remix-run/cloudflare";
import { SupabaseOutletContext } from "../root";
import {
  Alert,
  Card,
  Container,
  Image,
  Paper,
  Progress,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  GoogleLoginButton,
  MicrosoftLoginButton,
} from "react-social-login-buttons";
import { IconInfoCircle, IconAlertCircle } from "@tabler/icons-react";

import googleImg from "../assets/google-warning.png";

import { signInWithAzure, signInWithGoogle } from "../auth";
import { createServerClient, getAccountId, safeQuery } from "../util";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const syncProgress = safeQuery(
    await supabase
      .from("account")
      .select("sync_progress")
      .eq("id", accountId)
      .single()
  );

  return json(
    {
      accountId,
      syncProgress: syncProgress?.sync_progress,
    },
    { headers: response.headers }
  );
};

export default function Login() {
  const { supabase, user } = useOutletContext<SupabaseOutletContext>();
  const provider = user.app_metadata?.provider;
  const params = new URLSearchParams(useLocation().search);
  const googleLogin = async () => {
    await signInWithGoogle(supabase, `${location.origin}/sync/callback`, [
      "https://www.googleapis.com/auth/calendar.readonly",
    ]);
  };
  const azureLogin = async () => {
    await signInWithAzure(supabase, `${location.origin}/sync/callback`, [
      "calendars.read",
      "offline_access",
    ]);
  };

  const { accountId, syncProgress: syncProgressOrig } =
    useLoaderData<typeof loader>();
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const revalidator = useRevalidator();
  useEffect(() => {
    setSyncProgress(
      typeof syncProgressOrig === "undefined" ? null : syncProgressOrig
    );
    const channel = supabase
      .channel("table-db-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "account",
          filter: `id=eq.${accountId}`,
        },
        (payload) => {
          const newSyncProgress = payload.new?.sync_progress || null;
          setSyncProgress(newSyncProgress);
          if (syncProgressOrig && !newSyncProgress) {
            revalidator.revalidate();
          }
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, accountId, syncProgressOrig]);

  return (
    <Container size="xs" p="sm">
      <Space h="lg" />
      {syncProgress === null && (
        <Stack>
          <Card>
            <Stack>
              <Title size="h2">Add your work calendar</Title>
              <Text>
                Divvy will analyze your calendar to help you understand and
                control your meeting load.
              </Text>
              {provider === "google" && (
                <GoogleLoginButton onClick={googleLogin}>
                  Sign in with Google
                </GoogleLoginButton>
              )}
              {provider === "azure" && (
                <MicrosoftLoginButton onClick={azureLogin}>
                  Sign in with Microsoft
                </MicrosoftLoginButton>
              )}
            </Stack>
          </Card>
          {params.has("error") && (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Authorization failed"
              color="red"
            >
              <Text>Divvy was not granted access to your calendar.</Text>
              <Text mt="md">{params.get("error")}</Text>
            </Alert>
          )}
          {provider === "false" && (
            <Alert
              icon={<IconInfoCircle size="1rem" />}
              title="Completing Google sign in"
            >
              <Text>
                Google manually approves apps for access to calendars. Divvy is
                currently awaiting approval. Until then, you will see the
                warning below. Please follow the steps shown to complete your
                sign in.
              </Text>
              <Image src={googleImg} mt="md" />
            </Alert>
          )}
        </Stack>
      )}
      {syncProgress !== null && (
        <Container>
          <Paper m="xl" p="xl">
            <Text>Analyzing your calendar</Text>
            <Progress
              size="xl"
              value={syncProgress * 100}
              animate
              sx={{ position: "relative" }}
            />
          </Paper>
        </Container>
      )}
    </Container>
  );
}
