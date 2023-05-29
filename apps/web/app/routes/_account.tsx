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
import startOfWeek from "date-fns/startOfWeek";
import endOfWeek from "date-fns/endOfWeek";
import startOfMonth from "date-fns/startOfMonth";
import endOfMonth from "date-fns/endOfMonth";
import startOfDay from "date-fns/startOfDay";
import endOfDay from "date-fns/endOfDay";
import sub from "date-fns/sub";

import type { Database } from "@cadence/db";
import { SupabaseOutletContext } from "../root";
import { APP_NAME, createServerClient, getAccountId, safeQuery } from "../util";

type Account = Database["public"]["Tables"]["account"]["Row"];

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
    setSearchParams((p) => ({
      ...Object.fromEntries(p.entries()),
      timeframe,
      ...(timeframe === "custom"
        ? { start: range[0].toISOString(), end: range[1].toISOString() }
        : { start: "", end: "" }),
    }));
  };

  const getDefaultDateRange = (timeframe: string, date: Date): [Date, Date] => {
    switch (timeframe) {
      case "month":
        return [startOfMonth(date), endOfMonth(date)];
      case "week":
        return [startOfWeek(date), endOfWeek(date)];
      default:
      case "28d":
        return [startOfDay(sub(date, { days: 27 })), endOfDay(date)];
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
              start: startOfDay(range[0]).toISOString(),
              end: endOfDay(range[1]).toISOString(),
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
