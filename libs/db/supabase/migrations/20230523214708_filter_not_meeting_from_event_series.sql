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
WHERE (event_stats.is_meeting = TRUE)
GROUP BY
    event_stats.account_id,
    COALESCE(event_stats.series, event_stats.cal_id);

