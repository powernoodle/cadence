CREATE OR REPLACE VIEW "public"."event_length" AS
SELECT
    e.account_id,
    e.minutes,
    count(DISTINCT e.id) AS meeting_count,
    sum(e.minutes) AS minutes_sum,
    meeting_cost (count(DISTINCT e.id), (sum(e.attendee_count))::integer, sum(e.minutes)) AS "cost"
FROM (event_stats e
    JOIN attendee a ON (e.id = a.event_id))
WHERE (e.is_meeting = TRUE)
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
WHERE ((a.is_organizer = TRUE)
    AND (e.is_meeting = TRUE))
GROUP BY
    e.account_id,
    a.account_id;

