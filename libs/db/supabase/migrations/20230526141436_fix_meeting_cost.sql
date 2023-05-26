DROP VIEW IF EXISTS "public"."event_length";

DROP VIEW IF EXISTS "public"."event_series";

DROP VIEW IF EXISTS "public"."organizer";

DROP FUNCTION IF EXISTS "public"."meeting_cost" (occurrence_count bigint, attendee_count integer, minute_sum bigint);

SET check_function_bodies = OFF;

CREATE OR REPLACE FUNCTION public.meeting_cost (attendee_occurrences integer, attendee_minutes numeric)
    RETURNS integer
    LANGUAGE plpgsql
    AS $function$
BEGIN
    RETURN (attendee_occurrences * 10 + attendee_minutes)::integer;
END;
$function$;

CREATE OR REPLACE VIEW "public"."event_length" AS
SELECT
    e.account_id,
    e.length,
    count(DISTINCT e.id) AS meeting_count,
    sum(e.length) AS length_sum,
    meeting_cost ((sum(e.attendee_count))::integer, sum(e.attendee_count * e.length)) AS "cost"
FROM
    event_stats e
WHERE (e.is_meeting = TRUE)
GROUP BY
    e.account_id,
    e.length;

CREATE OR REPLACE VIEW "public"."event_series" AS
SELECT
    event_stats.account_id,
    COALESCE(event_stats.series, event_stats.cal_id) AS series,
    max(event_stats.title) AS title,
    bool_or(event_stats.is_meeting) AS is_meeting,
    bool_or(event_stats.is_online) AS is_online,
    bool_or(event_stats.is_onsite) AS is_onsite,
    bool_or(event_stats.is_offsite) AS is_offsite,
    count(DISTINCT event_stats.id) AS meeting_count,
    sum(event_stats.length) AS length_sum,
    meeting_cost ((sum(event_stats.attendee_count))::integer, sum(event_stats.attendee_count * event_stats.length)) AS "cost",
    avg(event_stats.attendee_count) AS attendee_count,
    avg(event_stats.length) AS length
FROM
    event_stats
WHERE (event_stats.is_meeting = TRUE)
GROUP BY
    event_stats.account_id,
    COALESCE(event_stats.series, event_stats.cal_id);

CREATE OR REPLACE VIEW "public"."organizer" AS
SELECT
    e.account_id,
    a.account_id AS id,
    max(act.name) AS name,
    max(act.email) AS email,
    count(DISTINCT e.id) AS meeting_count,
    sum(e.length) AS length_sum,
    meeting_cost ((sum(e.attendee_count))::integer, sum(e.attendee_count * e.length)) AS "cost"
FROM ((event_stats e
        JOIN attendee a ON (e.id = a.event_id))
    JOIN account act ON (a.account_id = act.id))
WHERE ((a.is_organizer = TRUE)
    AND (e.is_meeting = TRUE))
GROUP BY
    e.account_id,
    a.account_id;

