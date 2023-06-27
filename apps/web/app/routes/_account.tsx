import { useState } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useLocation,
  useOutletContext,
  useSearchParams,
  Outlet,
  Link,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import {
  AppShell,
  Burger,
  MediaQuery,
  Navbar,
  NavLink,
  Select,
  useMantineTheme,
} from "@mantine/core";

import {
  toDate,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "@divvy/tz";

import add from "date-fns/add";
import sub from "date-fns/sub";
import differenceInDays from "date-fns/differenceInDays";

import { SupabaseOutletContext } from "../root";
import { createServerClient, getAccountId, safeQuery } from "../util";
import { USER_TZ } from "../config";
import Header from "../components/header";

export const getDateRange = (params: URLSearchParams, timeframe?: string) => {
  const startParam = params.get("start");
  const endParam = params.get("end");
  if (!timeframe) timeframe = params.get("timeframe") || "28d";
  const start = startParam
    ? startOfDay(toDate(startParam, USER_TZ), USER_TZ)
    : startOfDay(new Date(), USER_TZ);
  const end = endParam
    ? endOfDay(toDate(endParam, USER_TZ), USER_TZ)
    : endOfDay(new Date(), USER_TZ);

  switch (timeframe) {
    case "month":
      return [
        [startOfMonth(end, USER_TZ), endOfMonth(end, USER_TZ)],
        [
          startOfMonth(sub(end, { months: 1 }), USER_TZ),
          endOfMonth(sub(end, { months: 1 }), USER_TZ),
        ],
        [
          startOfMonth(add(end, { months: 1 }), USER_TZ),
          endOfMonth(add(end, { months: 1 }), USER_TZ),
        ],
      ];
    case "week":
      return [
        [startOfWeek(end, USER_TZ), endOfWeek(end, USER_TZ)],
        [
          startOfWeek(sub(end, { weeks: 1 }), USER_TZ),
          endOfWeek(sub(end, { weeks: 1 }), USER_TZ),
        ],
        [
          startOfWeek(add(end, { weeks: 1 }), USER_TZ),
          endOfWeek(add(end, { weeks: 1 }), USER_TZ),
        ],
      ];
    case "28d":
      return [
        [startOfDay(sub(end, { days: 27 }), USER_TZ), endOfDay(end, USER_TZ)],
        [
          startOfDay(sub(end, { days: 27 + 28 }), USER_TZ),
          endOfDay(sub(end, { days: 28 }), USER_TZ),
        ],
        [
          startOfDay(add(end, { days: 1 }), USER_TZ),
          endOfDay(add(end, { days: 28 }), USER_TZ),
        ],
      ];
    default:
      return [
        [start, end],
        [
          sub(start, { days: differenceInDays(end, start) + 1 }),
          sub(end, { days: differenceInDays(end, start) }),
        ],
        [
          add(start, { days: differenceInDays(end, start) }),
          add(end, { days: differenceInDays(end, start) + 1 }),
        ],
      ];
  }
};

export const loader = async ({ context, request }: LoaderArgs) => {
  const { response, supabase } = createServerClient(context, request);
  const accountId = await getAccountId(request, supabase);

  const accounts = safeQuery(
    await supabase
      .from("account")
      .select("id, name, email")
      .not("user_id", "is", null)
      .order("name")
      .order("email")
  );

  const isAdmin = safeQuery(await supabase.rpc("is_admin"));
  const url = new URL(request.url);

  let syncedAt;
  {
    const data = safeQuery(
      await supabase
        .from("account")
        .select("synced_at")
        .eq("id", accountId)
        .single()
    );
    syncedAt = data?.synced_at;
  }
  if (!syncedAt) {
    if (isAdmin && !url.pathname.startsWith("/admin")) {
      return redirect(`/admin`, {
        status: 303,
        headers: response.headers,
      });
    } else if (!isAdmin && !url.pathname.startsWith("/sync")) {
      return redirect(`/sync`, {
        status: 303,
        headers: response.headers,
      });
    }
  }

  const [current] = getDateRange(url.searchParams);
  const dateRange: [Date | null, Date | null] = [
    current[0],
    startOfDay(current[1], USER_TZ),
  ];

  return json(
    {
      isAdmin,
      accountId,
      accounts: accounts ?? [],
      dateRange,
      syncedAt,
    },
    { headers: response.headers }
  );
};

function AccountSelect() {
  const { accountId, accounts } = useLoaderData<typeof loader>();
  const [value, setValue] = useState<number | null>(accountId || null);
  const handleChange = (id: string) => {
    const idNum = parseInt(id);
    setValue(idNum);
    setSearchParams((p) => ({
      ...Object.fromEntries(p.entries()),
      account: id.toString(),
    }));
  };

  const [_searchParams, setSearchParams] = useSearchParams();

  return (
    <Select
      mb="md"
      placeholder="Select account"
      value={value?.toString()}
      onChange={handleChange}
      data={accounts.map((account) => ({
        value: account.id.toString(),
        label: account.name
          ? `${account.name} (${account.email})`
          : account.email,
      }))}
    />
  );
}

function AppNavbar({ opened }: { opened: boolean }) {
  const location = useLocation();
  const { isAdmin } = useLoaderData<typeof loader>();

  return (
    <Navbar
      p="md"
      hiddenBreakpoint="sm"
      hidden={!opened}
      width={{ sm: 200, lg: 300 }}
    >
      <Navbar.Section grow>
        <NavLink
          label="Time Balance"
          component={Link}
          to={`/time${location.search}`}
          active={location.pathname === "/time"}
        />
        <NavLink
          label="Prioritize"
          component={Link}
          to={`/schedule${location.search}`}
          active={location.pathname === "/prioritize"}
        />
        <NavLink
          label="Review"
          component={Link}
          to={`/schedule${location.search}`}
          active={location.pathname === "/review"}
        />
      </Navbar.Section>
      <Navbar.Section>
        {isAdmin && (
          <>
            <AccountSelect />
            <NavLink
              label="Admin"
              component={Link}
              to={`/admin`}
              active={location.pathname === "/admin"}
            />
          </>
        )}
        <NavLink
          label="Settings"
          component={Link}
          to={"/sync"}
          active={location.pathname === "/sync"}
        />
      </Navbar.Section>
    </Navbar>
  );
}

export default function Index() {
  const { syncedAt } = useLoaderData<typeof loader>();
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const ctx = useOutletContext<SupabaseOutletContext>();

  return (
    <AppShell
      styles={{
        main: {
          background:
            theme.colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
        },
      }}
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={syncedAt ? <AppNavbar opened={opened} /> : undefined}
      header={
        <Header
          menu={
            <MediaQuery largerThan="sm" styles={{ display: "none" }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                color={theme.colors.gray[6]}
                mr="xl"
              />
            </MediaQuery>
          }
        />
      }
    >
      <Outlet context={ctx} />
    </AppShell>
  );
}
