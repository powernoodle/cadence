CREATE TYPE "public"."event_type" AS enum (
    'internal',
    'external',
    'personal',
    'focus',
    'growth'
);

DROP FUNCTION IF EXISTS "public"."event_by_length" (event_account_id bigint, during tstzrange);

DROP FUNCTION IF EXISTS "public"."meeting_cost" (attendee_occurrences integer, attendee_minutes numeric);

DROP FUNCTION IF EXISTS "public"."event_series" (event_account_id bigint, during tstzrange);

DROP VIEW IF EXISTS "public"."event_stats";

DROP FUNCTION IF EXISTS "public"."event_length" (at tstzrange, during tstzrange);

CREATE TABLE "public"."day" (
    "day" date NOT NULL,
    "account_id" bigint NOT NULL,
    "focus_minutes" smallint NOT NULL DEFAULT '0' ::smallint,
    "focus_blocks" smallint NOT NULL DEFAULT '0' ::smallint,
    "slack_minutes" smallint NOT NULL DEFAULT '0' ::smallint,
    "slack_blocks" smallint NOT NULL DEFAULT '0' ::smallint
);

ALTER TABLE "public"."day" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event"
    DROP COLUMN "is_meeting";

ALTER TABLE "public"."event"
    ADD COLUMN "attended_length" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."event"
    ADD COLUMN "day" date;

ALTER TABLE "public"."event"
    ADD COLUMN "is_cancelled" boolean NOT NULL DEFAULT FALSE;

ALTER TABLE "public"."event"
    ADD COLUMN "response" attendance;

ALTER TABLE "public"."event"
    ADD COLUMN "type" event_type;

CREATE UNIQUE INDEX day_pkey ON public.day USING btree (day, account_id);

ALTER TABLE "public"."day"
    ADD CONSTRAINT "day_pkey" PRIMARY KEY USING INDEX "day_pkey";

ALTER TABLE "public"."day"
    ADD CONSTRAINT "day_account_id_fkey" FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."day" validate CONSTRAINT "day_account_id_fkey";

SET check_function_bodies = OFF;

CREATE OR REPLACE FUNCTION public.calculate_day (_account_id bigint, _day date)
    RETURNS void
    LANGUAGE plpgsql
    AS $function$
DECLARE
    events jsonb[] := '{}';
    e jsonb;
    lengths jsonb = '{}'::jsonb;
    cur integer := NULL;
    nxt integer;
    priority integer := 0;
    matches bigint[];
    m bigint;
    gap integer := 0;
    _focus_minutes integer := 0;
    _focus_blocks integer := 0;
    _slack_minutes integer := 0;
    _slack_blocks integer := 0;
BEGIN
    SELECT
        ARRAY (
            SELECT
                jsonb_build_object('id', id, 'start', FLOOR(EXTRACT(epoch FROM LOWER(at)) / 60), 'end', FLOOR(EXTRACT(epoch FROM UPPER(at)) / 60), 'priority', response_priority (response))
            FROM
                event
            WHERE
                account_id = _account_id
                AND day = _day
                AND (response IS NULL
                    OR response != 'declined')
                AND type IS NOT NULL
                AND type != 'focus'
                AND is_cancelled = FALSE
            ORDER BY
                LOWER(at) ASC,
                response_priority (response) DESC) INTO events;
    IF FOUND THEN
        cur := (events[1] ->> 'start')::integer;
    END IF;
    FOREACH e IN ARRAY events LOOP
        lengths[(e ->> 'id')::text] = 0;
    END LOOP;
    LOOP
        nxt := 2147483647;
        -- max
        priority := 0;
        matches := '{}';
        FOREACH e IN ARRAY events LOOP
            -- The first event that starts later
            IF (e ->> 'start')::integer > cur THEN
                -- If we reached the next start without matching, there's a gap
                IF nxt = 2147483647 THEN
                    gap := LEAST ((e ->> 'start')::integer, (events[1] ->> 'start')::integer + 8 * 60) - cur;
                    IF gap > 30 THEN
                        _focus_minutes := _focus_minutes + gap;
                        _focus_blocks := _focus_blocks + 1;
                    ELSE
                        _slack_minutes := _slack_minutes + gap;
                        _slack_blocks := _slack_blocks + 1;
                    END IF;
                END IF;
                nxt := LEAST (nxt, (e ->> 'start')::integer);
                EXIT;
            END IF;
            -- Events that are already done, or lower priority
            CONTINUE
            WHEN (e ->> 'end')::integer <= cur
                OR (e ->> 'priority')::integer < priority;
            nxt := LEAST (nxt, (e ->> 'end')::integer);
            IF (e ->> 'priority')::integer > priority THEN
                priority := e ->> 'priority';
                matches := '{}';
            END IF;
            matches := matches || (e ->> 'id')::bigint;
        END LOOP;
        FOREACH m IN ARRAY matches LOOP
            lengths[m::text] = (lengths ->> (m::text))::real + (nxt - cur) / ARRAY_LENGTH(matches, 1);
        END LOOP;
        EXIT
        WHEN nxt = 2147483647;
        cur := nxt;
    END LOOP;
    UPDATE
        event AS e
    SET
        attended_length = (lengths ->> (e.id::text))::int
    WHERE
        e.id IN (
            SELECT
                key::int
            FROM
                jsonb_each_text(lengths));
    -- There's usally a final gap, with whatever time remains in the eight-hour day
    gap := 8 * 60;
    IF cur IS NOT NULL THEN
        gap := gap - (cur - (events[1] ->> 'start')::integer);
    END IF;
    -- Only add focus and slack on weekdays
    IF EXTRACT(ISODOW FROM _day) < 6 THEN
        IF gap > 30 THEN
            _focus_minutes := _focus_minutes + gap;
            _focus_blocks := _focus_blocks + 1;
        ELSIF gap > 0 THEN
            _slack_minutes := _slack_minutes + gap;
            _slack_blocks := _slack_blocks + 1;
        END IF;
    END IF;
    INSERT INTO day (account_id, day, focus_minutes, focus_blocks, slack_minutes, slack_blocks)
        VALUES (_account_id, _day, _focus_minutes, _focus_blocks, _slack_minutes, _slack_blocks)
    ON CONFLICT (account_id, day)
        DO UPDATE SET
            focus_minutes = EXCLUDED.focus_minutes, focus_blocks = EXCLUDED.focus_blocks, slack_minutes = EXCLUDED.slack_minutes, slack_blocks = EXCLUDED.slack_blocks;
END
$function$;

CREATE OR REPLACE FUNCTION public.day_stats (_account_id bigint, during daterange)
    RETURNS TABLE (
        account_id bigint,
        type text,
        minutes integer,
        num numeric)
    LANGUAGE plpgsql
    AS $function$
DECLARE
    num_days integer;
BEGIN
    SELECT
        COUNT(*) INTO num_days
    FROM
        generate_series('2022-01-01'::date, '2022-01-31'::date, '1 day') AS d
WHERE
    EXTRACT(ISODOW FROM d) < 6;
    RETURN QUERY
    SELECT
        day.account_id,
        'focus' AS type,
        ROUND(AVG(day.focus_minutes * 5))::integer AS minutes,
        AVG(day.focus_blocks * 5) AS num
    FROM
        day
    WHERE
        day.account_id = _account_id
        AND day.day <@ during
    GROUP BY
        day.account_id
    UNION (
        SELECT
            event.account_id,
            event.type::text,
            ROUND(SUM(event.attended_length) * 5 / num_days)::integer AS minutes,
            (COUNT(*) * 5 / num_days)::numeric AS num
        FROM
            event
        WHERE
            event.account_id = _account_id
            AND event.type IS NOT NULL
            AND event.day <@ during
        GROUP BY
            event.account_id,
            event.type);
END;
$function$;

CREATE OR REPLACE FUNCTION public.response_priority (response attendance)
    RETURNS integer
    LANGUAGE plpgsql
    AS $function$
BEGIN
    CASE WHEN response = 'accepted' THEN
        RETURN 1000;
    WHEN response = 'tentative' THEN
        RETURN 100;
    WHEN response IS NULL THEN
        RETURN 10;
    ELSE
        RETURN 0;
    END CASE;
END
$function$;

CREATE OR REPLACE FUNCTION public.event_series (event_account_id bigint, during tstzrange)
    RETURNS TABLE (
        account_id bigint,
        series text,
        title text,
        type event_type,
        is_online boolean,
        is_onsite boolean,
        is_offsite boolean,
        meeting_count integer,
        length numeric,
        length_sum integer,
        attended_length integer,
        attendee_count numeric,
        invitee_count numeric)
    LANGUAGE plpgsql
    AS $function$
BEGIN
    RETURN QUERY
    SELECT
        e.account_id,
        COALESCE(e.series, e.cal_id) AS series,
        max(e.title) AS title,
        max(e.type) AS type,
        bool_or(e.is_online) AS is_online,
        bool_or(e.is_onsite) AS is_onsite,
        bool_or(e.is_offsite) AS is_offsite,
        count(DISTINCT e.id)::int AS meeting_count,
        sum(event_length (e.at, during))::int AS length_sum,
        avg(e.length) AS length,
        sum(attended_length) AS attended_length,
        avg(e.attendee_count) AS attendee_count,
        avg(e.invitee_count) AS invitee_count
    FROM
        event_stats e
    WHERE
        e.is_meeting = TRUE
        AND e.account_id = event_account_id
        AND e.at && during
    GROUP BY
        e.account_id,
        COALESCE(e.series, e.cal_id);
END;
$function$;

CREATE OR REPLACE VIEW "public"."event_stats" AS
SELECT
    e.id,
    e.created_at,
    e.account_id,
    e.cal_id,
    e.series,
    e.at,
    (floor(((EXTRACT(epoch FROM upper(e.at)) - EXTRACT(epoch FROM lower(e.at))) / (60)::numeric)))::integer AS length,
    e.title,
    e.type,
    e.attended_length,
    e.is_cancelled,
    e.is_online,
    e.is_onsite,
    e.is_offsite,
    e.response,
    string_agg((a.account_id)::text, ','::text ORDER BY a.account_id) AS invitees,
    count(*) AS invitee_count,
    count(*) FILTER (WHERE (a.response = 'accepted'::attendance)) AS attendee_count
FROM (event e
    JOIN attendee a ON (e.id = a.event_id))
GROUP BY
    e.id;

CREATE OR REPLACE FUNCTION public.link_series (account_id bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $function$
BEGIN
    UPDATE
        event
    SET
        series = subquery.series
    FROM (
        SELECT
            ARRAY_AGG(id),
            MAX(series) AS series
        FROM
            event_stats
        WHERE
            event_stats.account_id = $1
        GROUP BY
            title,
            invitees
        HAVING
            COUNT(*) > 1) AS subquery
WHERE
    event.id = ANY (subquery.array_agg);
END;
$function$;

CREATE POLICY "Admins can read all stats" ON "public"."day" AS permissive
    FOR SELECT TO authenticated
        USING (is_admin ());

CREATE POLICY "Users can read their own stats" ON "public"."day" AS permissive
    FOR SELECT TO authenticated
        USING ((auth.uid () IN (
            SELECT
                account.user_id
            FROM
                account
            WHERE (account.id = day.account_id))));

