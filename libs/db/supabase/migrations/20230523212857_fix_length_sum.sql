CREATE OR REPLACE VIEW "public"."event_length" AS
SELECT
    e.account_id,
    e.length,
    count(DISTINCT e.id) AS meeting_count,
    sum(e.length) AS length_sum,
    meeting_cost (count(DISTINCT e.id), (sum(e.attendee_count))::integer, sum(e.length)) AS "cost"
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
    meeting_cost (count(DISTINCT event_stats.id), (sum(event_stats.attendee_count))::integer, sum(event_stats.length)) AS "cost",
    avg(event_stats.attendee_count) AS attendee_count,
    avg(event_stats.length) AS length
FROM
    event_stats
GROUP BY
    event_stats.account_id,
    COALESCE(event_stats.series, event_stats.cal_id);

