import { useEffect, useState, ReactNode } from "react";
import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
  Outlet,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import {
  AppShell,
  Aside,
  Burger,
  Button,
  Flex,
  Footer,
  Group,
  Header,
  MediaQuery,
  Navbar,
  Select,
  Text,
  Title,
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

import type { Database } from "@cadence/db";
import { SupabaseOutletContext } from "../root";
import { APP_NAME, createServerClient, getAccountId, safeQuery } from "../util";

type Account = Database["public"]["Tables"]["account"]["Row"];

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
  );

  const isAdmin = safeQuery(await supabase.rpc("is_admin"));

  const [current] = getDateRange(new URL(request.url).searchParams);
  console.log(current);
  const dateRange: [Date | null, Date | null] = [
    current[0],
    startOfDay(current[1], USER_TZ),
  ];

  return json(
    { isAdmin, accountId, accounts: accounts ?? [], dateRange },
    { headers: response.headers }
  );
};

function AccountSelect({
  accounts,
  defaultValue,
  onChange,
}: {
  accounts: Pick<Account, "id" | "name" | "email">[];
  defaultValue?: number;
  onChange: (id: number) => void;
}) {
  const [value, setValue] = useState<number | null>(defaultValue || null);
  const handleChange = (id: string) => {
    const idNum = parseInt(id);
    setValue(idNum);
    onChange(idNum);
  };
  return (
    <Select
      placeholder="Select account"
      w="20em"
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

function AppHeader({ menu }: { menu: ReactNode }) {
  const { isAdmin, accountId, accounts } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const logout = async () => {
    await supabase.auth.signOut();
  };
  const [_searchParams, setSearchParams] = useSearchParams();

  const accountSwitch = async (id: number) => {
    setSearchParams((p) => ({
      ...Object.fromEntries(p.entries()),
      account: id.toString(),
    }));
  };

  return (
    <Header height={60} p="xs">
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="flex-start"
        direction="row"
        wrap="wrap"
      >
        <Group>
          {menu}
          <Title order={1} size="h2">
            {APP_NAME}
          </Title>
        </Group>
        <Group>
          {isAdmin && (
            <AccountSelect
              accounts={accounts}
              defaultValue={accountId || undefined}
              onChange={accountSwitch}
            />
          )}
          <Button onClick={logout}>Logout</Button>
        </Group>
      </Flex>
    </Header>
  );
}

function AppNavbar({ opened }: { opened: boolean }) {
  const { dateRange: _defaultDateRange } = useLoaderData<typeof loader>();
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
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="flex-start"
        direction="row"
        wrap="wrap"
      >
        <Select
          value={timeframe}
          onChange={onTimeframeChange}
          data={timeframes}
        />
        <DatePickerInput
          type="range"
          value={dateRange}
          onChange={onDateRangeChange}
          allowSingleDateInRange
        />
      </Flex>
    </Navbar>
  );
}

export default function Index() {
  const ctx = useOutletContext<SupabaseOutletContext>();
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
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
        <AppHeader
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
