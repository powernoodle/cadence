CREATE TYPE "public"."event_status" AS enum (
    'attended',
    'scheduled',
    'pending',
    'declined'
);

DROP FUNCTION IF EXISTS "public"."day_stats" (_account_id bigint, during daterange);

SET check_function_bodies = OFF;

CREATE OR REPLACE FUNCTION public.calc_event_status (at tstzrange, response attendance)
    RETURNS event_status
    LANGUAGE plpgsql
    AS $function$
DECLARE
    is_past boolean;
BEGIN
    is_past := LOWER(at) < now();
    IF response = 'declined' THEN
        RETURN 'declined';
    ELSIF is_past THEN
        RETURN 'attended';
    ELSIF response = 'accepted' THEN
        RETURN 'scheduled';
    ELSE
        RETURN 'pending';
    END IF;
END;
$function$;

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
        type event_type,
        status event_status,
        weekly_minutes integer,
        total_count integer)
    LANGUAGE plpgsql
    AS $function$
DECLARE
    num_days integer;
BEGIN
    SELECT
        COUNT(*) INTO num_days
    FROM
        generate_series(LOWER(during), UPPER(during), '1 day') AS d
WHERE
    EXTRACT(ISODOW FROM d) < 6;
    RETURN QUERY
    SELECT
        day.account_id,
        'focus' AS type,
        'scheduled' AS status,
        ROUND(AVG(day.focus_minutes * 5))::integer AS minutes,
        SUM(day.focus_blocks)::integer AS total_count
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
            event.type,
            public.calc_event_status (event.at, event.response) AS status,
            ROUND(SUM(event.attended_length) * 5 / num_days)::integer AS minutes,
            COUNT(*)::integer AS total_count
        FROM
            event
        WHERE
            event.account_id = _account_id
            AND event.type IS NOT NULL
            AND event.day <@ during
        GROUP BY
            event.account_id,
            event.type,
            public.calc_event_status (event.at, event.response));
END;
$function$;

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

