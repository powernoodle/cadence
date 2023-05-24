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
    count(*) AS attendee_count,
    string_agg((a.account_id)::text, ','::text ORDER BY a.account_id) AS attendees
FROM (event e
    JOIN attendee a ON (e.id = a.event_id))
GROUP BY
    e.id;

