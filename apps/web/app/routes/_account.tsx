import type { LoaderArgs } from "@remix-run/cloudflare";

import {
  useLoaderData,
  useOutletContext,
  useSearchParams,
  Outlet,
} from "@remix-run/react";
import { json } from "@remix-run/cloudflare";
import { useState } from "react";
import {
  AppShell,
  Header,
  Group,
  Flex,
  Title,
  Button,
  Select,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";

import add from "date-fns/add";
import differenceInDays from "date-fns/differenceInDays";
import sub from "date-fns/sub";
import {
  fromTz,
  toTz,
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

export const getDateRange = (request: Request) => {
  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  const timeframe = url.searchParams.get("timeframe") || "28d";
  const start = startParam
    ? toDate(startParam, USER_TZ)
    : startOfDay(new Date(), USER_TZ);
  const end = add(
    endParam ? toDate(endParam, USER_TZ) : endOfDay(new Date(), USER_TZ),
    {
      seconds: 60 * 60 * 24 - 1,
    }
  );

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
          sub(start, { days: differenceInDays(end, start) }),
          sub(end, { days: differenceInDays(end, start) }),
        ],
        [
          add(start, { days: differenceInDays(end, start) }),
          add(end, { days: differenceInDays(end, start) }),
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

  return json(
    { isAdmin, accountId, accounts: accounts ?? [] },
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

function AppHeader() {
  const { isAdmin, accountId, accounts } = useLoaderData<typeof loader>();
  const { supabase } = useOutletContext<SupabaseOutletContext>();

  const logout = async () => {
    await supabase.auth.signOut();
  };
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
    const range = getDefaultDateRange(timeframe, new Date());
    setDateRange(range);
    setSearchParams((p) => {
      const {
        start: _1,
        end: _2,
        ...otherParams
      } = Object.fromEntries(p.entries());
      return {
        ...otherParams,
        timeframe,
        ...(timeframe === "custom"
          ? {
              start: formatDate(range[0], USER_TZ, "yyyy-MM-dd"),
              end: formatDate(range[1], USER_TZ, "yyyy-MM-dd"),
            }
          : {}),
      };
    });
  };

  const getDefaultDateRange = (timeframe: string, date: Date): [Date, Date] => {
    switch (timeframe) {
      case "month":
        return [startOfMonth(date, USER_TZ), endOfMonth(date, USER_TZ)];
      case "week":
        return [startOfWeek(date, USER_TZ), endOfWeek(date, USER_TZ)];
      default:
      case "28d":
        return [
          startOfDay(sub(date, { days: 27 }), USER_TZ),
          endOfDay(date, USER_TZ),
        ];
    }
  };

  let defaultDateRange: [Date, Date];
  if (searchParams.get("start") && searchParams.get("end")) {
    defaultDateRange = [
      new Date(searchParams.get("start") as string),
      new Date(searchParams.get("end") as string),
    ];
  } else {
    defaultDateRange = getDefaultDateRange(timeframe, new Date());
  }
  const [dateRange, setDateRange] =
    useState<[Date | null, Date | null]>(defaultDateRange);

  const onDateRangeChange = (range: [Date | null, Date | null]) => {
    setDateRange(range);
    if (range[0] !== null && range[1] !== null) {
      setTimeframeState("custom");
      setSearchParams((p) => ({
        ...Object.fromEntries(p.entries()),
        timeframe: "custom",
        ...(range[0] && range[1]
          ? {
              start: formatDate(range[0], USER_TZ, "yyyy-MM-dd"),
              end: formatDate(range[1], USER_TZ, "yyyy-MM-dd"),
            }
          : {}),
      }));
    }
  };

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
          <Title order={1} size="h2">
            {APP_NAME}
          </Title>
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

export default function Index() {
  const ctx = useOutletContext<SupabaseOutletContext>();
  return (
    <AppShell header={<AppHeader />}>
      <Outlet context={ctx} />
    </AppShell>
  );
}
