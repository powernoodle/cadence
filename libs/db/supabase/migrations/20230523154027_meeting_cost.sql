DROP VIEW IF EXISTS "public"."event_length";

DROP VIEW IF EXISTS "public"."organizer";

SET check_function_bodies = OFF;

CREATE OR REPLACE FUNCTION public.meeting_cost (occurrence_count bigint, attendee_count integer, minute_sum bigint)
    RETURNS integer
    LANGUAGE plpgsql
    AS $function$
BEGIN
    RETURN occurrence_count * attendee_count * 10 + attendee_count * minute_sum;
END;
$function$;

CREATE OR REPLACE VIEW "public"."event_length" AS
SELECT
    e.account_id,
    e.minutes,
    count(DISTINCT e.id) AS meeting_count,
    sum(e.minutes) AS minutes_sum,
    meeting_cost (count(DISTINCT e.id), (sum(e.attendee_count))::integer, sum(e.minutes)) AS "cost"
FROM (event_stats e
    JOIN attendee a ON (e.id = a.event_id))
GROUP BY
    e.account_id,
    e.minutes;

CREATE OR REPLACE VIEW "public"."organizer" AS
SELECT
    e.account_id,
    a.account_id AS id,
    max(act.name) AS name,
    max(act.email) AS email,
    count(DISTINCT e.id) AS meeting_count,
    sum(e.minutes) AS minutes_sum,
    meeting_cost (count(DISTINCT e.id), (sum(e.attendee_count))::integer, sum(e.minutes)) AS "cost"
FROM ((event_stats e
        JOIN attendee a ON (e.id = a.event_id))
    JOIN account act ON (a.account_id = act.id))
WHERE (a.is_organizer = TRUE)
GROUP BY
    e.account_id,
    a.account_id;

