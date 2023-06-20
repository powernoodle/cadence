import { useEffect, useState } from "react";
import {
  useOutletContext,
  useLocation,
  useLoaderData,
  useRevalidator,
} from "@remix-run/react";
import { LoaderArgs, json } from "@remix-run/cloudflare";
import { ClientOnly } from "remix-utils";
import {
  Alert,
  Button,
  Card,
  Container,
  Image,
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
import formatDate from "date-fns/format";

import { SupabaseOutletContext } from "../root";
import { signInWithAzure, signInWithGoogle } from "../auth";
import { createServerClient, getAccountId, safeQuery } from "../util";

import googleImg from "../assets/google-warning.png";

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  let syncedAt, syncProgress;
  {
    const data = safeQuery(
      await supabase
        .from("account")
        .select("synced_at, sync_progress")
        .eq("id", accountId)
        .single()
    );
    syncedAt = data?.synced_at;
    syncProgress = data?.sync_progress || null;
  }

  return json(
    {
      accountId,
      syncProgress,
      syncedAt,
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

  const {
    accountId,
    syncProgress: syncProgressOrig,
    syncedAt,
  } = useLoaderData<typeof loader>();
  const [syncProgress, setSyncProgress] = useState<number | null>(
    syncProgressOrig
  );
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

  const [reauth, setReauth] = useState(false);

  return (
    <Container size="xs" p="sm">
      <Space h="lg" />
      <Stack>
        {syncedAt && syncProgress === null && (
          <Card>
            <Stack>
              <ClientOnly>
                {() => (
                  <Text>
                    Calendar {user.email} synced at{" "}
                    {formatDate(new Date(syncedAt), "yyyy-MM-dd h:mm aaa")}.
                  </Text>
                )}
              </ClientOnly>

              {!reauth && (
                <Button onClick={() => setReauth(true)}>Re-authorize</Button>
              )}
            </Stack>
          </Card>
        )}
        {(reauth || (!syncedAt && syncProgress === null)) && (
          <>
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
                  Google manually approves apps for access to calendars. Divvy
                  is currently awaiting approval. Until then, you will see the
                  warning below. Please follow the steps shown to complete your
                  sign in.
                </Text>
                <Image src={googleImg} mt="md" />
              </Alert>
            )}
          </>
        )}
        {syncProgress !== null && (
          <Card>
            <Title size="h2" mb="md">
              Analyzing your calendar
            </Title>
            <Progress
              size="xl"
              value={syncProgress * 100}
              animate
              sx={{ position: "relative" }}
            />
            <Text mt="md">This may take several minutes.</Text>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
