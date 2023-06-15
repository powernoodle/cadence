import { useEffect, useState } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

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
  Text,
  Container,
  Paper,
  Progress,
  MediaQuery,
  Navbar,
  NavLink,
  Select,
  useMantineTheme,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";

import add from "date-fns/add";
import differenceInDays from "date-fns/differenceInDays";
import sub from "date-fns/sub";
import {
  toTz,
  fromTz,
  toDate,
  endOfDay,
  endOfMonth,
  endOfWeek,
  formatDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "../tz";

import { SupabaseOutletContext } from "../root";
import { createServerClient, getAccountId, safeQuery } from "../util";
import Header from "../components/header";

// TODO: load this from the account
export const USER_TZ = "America/New_York";

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

  const [current] = getDateRange(new URL(request.url).searchParams);
  const dateRange: [Date | null, Date | null] = [
    current[0],
    startOfDay(current[1], USER_TZ),
  ];

  const syncProgress = safeQuery(
    await supabase
      .from("account")
      .select("sync_progress")
      .eq("id", accountId)
      .single()
  );

  return json(
    {
      isAdmin,
      accountId,
      accounts: accounts ?? [],
      dateRange,
      syncProgress: syncProgress?.sync_progress,
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
  const { dateRange: _defaultDateRange, isAdmin } =
    useLoaderData<typeof loader>();
  const defaultDateRange: [Date, Date] = [
    fromTz(new Date(_defaultDateRange[0] as string), USER_TZ),
    fromTz(new Date(_defaultDateRange[1] as string), USER_TZ),
  ];
  useEffect(() => {
    setDateRange(defaultDateRange);
  }, _defaultDateRange);

  const [searchParams, setSearchParams] = useSearchParams();

  const timeframes = [
    { label: "28 Days", value: "28d" },
    { label: "Month", value: "month" },
    { label: "Week", value: "week" },
    { label: "Custom", value: "custom" },
  ];
  const [timeframe, setTimeframeState] = useState(
    searchParams.get("timeframe") || "28d"
  );
  const onTimeframeChange = async (timeframe: string) => {
    if (!timeframe) return;
    setTimeframeState(timeframe);
    const [current] = getDateRange(
      new URLSearchParams(location.search),
      timeframe
    );
    setSearchParams((p) => {
      const { start, end, ...other } = Object.fromEntries(p.entries());
      return {
        ...other,
        timeframe,
        ...(timeframe === "custom"
          ? {
              start: formatDate(current[0], USER_TZ, "yyyy-MM-dd"),
              end: formatDate(current[1], USER_TZ, "yyyy-MM-dd"),
            }
          : {}),
      };
    });
  };

  const [dateRange, setDateRange] =
    useState<[Date | null, Date | null]>(defaultDateRange);

  const onDateRangeChange = (range: [Date | null, Date | null]) => {
    if (range[0] === null) return;
    switch (timeframe) {
      case "28d":
        range[1] = add(range[0], { days: 28 });
        break;
      case "month":
        range[1] = endOfMonth(range[0], USER_TZ);
        break;
      case "week":
        range[1] = endOfWeek(range[0], USER_TZ);
        break;
    }
    setDateRange(range);
    if (range[1] === null) return;
    setSearchParams((p) => ({
      ...Object.fromEntries(p.entries()),
      ...(range[0]
        ? {
            start: formatDate(toTz(range[0], USER_TZ), USER_TZ, "yyyy-MM-dd"),
          }
        : {}),
      ...(range[1]
        ? {
            end: formatDate(toTz(range[1], USER_TZ), USER_TZ, "yyyy-MM-dd"),
          }
        : {}),
    }));
  };

  return (
    <Navbar
      p="md"
      hiddenBreakpoint="sm"
      hidden={!opened}
      width={{ sm: 200, lg: 300 }}
    >
      {isAdmin && (
        <Navbar.Section mb="md">
          <AccountSelect />
        </Navbar.Section>
      )}
      <Navbar.Section>
        <NavLink
          label="Insights"
          component={Link}
          to={`/meetings${location.search}`}
          active={location.pathname === "/meetings"}
        />
        <NavLink
          label="Schedule"
          component={Link}
          to={`/schedule${location.search}`}
          active={location.pathname === "/schedule"}
        />
      </Navbar.Section>
      <Navbar.Section mt="md" grow>
        <Select
          mb="sm"
          value={timeframe}
          onChange={onTimeframeChange}
          data={timeframes}
        />
        <DatePickerInput
          mb="sm"
          type="range"
          value={dateRange}
          onChange={onDateRangeChange}
          allowSingleDateInRange
        />
      </Navbar.Section>
      {isAdmin && (
        <Navbar.Section>
          <NavLink
            label="Admin"
            component={Link}
            to={`/admin`}
            active={location.pathname === "/admin"}
          />
        </Navbar.Section>
      )}
    </Navbar>
  );
}

export default function Index() {
  const { accountId, syncProgress: syncProgressOrig } =
    useLoaderData<typeof loader>();
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const ctx = {
    ...useOutletContext<SupabaseOutletContext>(),
    syncProgress,
  };
  const supabase = ctx.supabase;
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
          setSyncProgress(payload.new?.sync_progress || null);
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [supabase, accountId, syncProgressOrig]);

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
      navbar={<AppNavbar opened={opened} />}
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
      {syncProgress !== null && (
        <Container>
          <Paper m="xl" p="xl">
            <Text>Loading calendar</Text>
            <Progress
              size="xl"
              value={syncProgress * 100}
              animate
              sx={{ position: "relative" }}
            />
          </Paper>
        </Container>
      )}
      {syncProgress === null && <Outlet context={ctx} />}
    </AppShell>
  );
}
