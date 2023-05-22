CREATE OR REPLACE VIEW "public"."event_stats" AS
SELECT
    e.id,
    e.created_at,
    e.account_id,
    e.cal_id,
    e.series,
    e.start_at,
    e.end_at,
    e.length,
    e.title,
    e.is_meeting,
    e.is_online,
    e.is_onsite,
    e.is_offsite,
    e.raw,
    count(*) AS attendee_count,
    ((EXTRACT(epoch FROM (e.end_at - e.start_at)) / (60)::numeric))::integer AS minutes
FROM (event e
    JOIN attendee a ON (e.id = a.event_id))
GROUP BY
    e.id;

CREATE OR REPLACE VIEW "public"."organizer" AS
SELECT
    e.account_id,
    a.account_id AS id,
    max(act.name) AS name,
    max(act.email) AS email,
    count(DISTINCT e.id) AS meeting_count,
    (sum(e.attendee_count))::integer AS attendee_count,
    sum(e.minutes) AS minutes_sum
FROM ((event_stats e
        JOIN attendee a ON (e.id = a.event_id))
    JOIN account act ON (a.account_id = act.id))
WHERE (a.is_organizer = TRUE)
GROUP BY
    e.account_id,
    a.account_id;

CREATE OR REPLACE FUNCTION public.is_admin ()
    RETURNS boolean
    LANGUAGE plpgsql
    AS $function$
BEGIN
    IF auth.jwt () ->> 'email' LIKE '%@letscollide.io' THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$function$;

CREATE OR REPLACE VIEW "public"."event_length" AS
SELECT
    e.account_id,
    e.minutes,
    count(DISTINCT e.id) AS meeting_count,
    (sum(e.attendee_count))::integer AS attendee_count,
    sum(e.minutes) AS minutes_sum
FROM (event_stats e
    JOIN attendee a ON (e.id = a.event_id))
GROUP BY
    e.account_id,
    e.minutes;

