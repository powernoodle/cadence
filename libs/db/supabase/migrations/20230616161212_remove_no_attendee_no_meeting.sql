CREATE OR REPLACE VIEW "public"."event_stats" AS
SELECT
    e.id,
    e.created_at,
    e.account_id,
    e.cal_id,
    e.series,
    e.at,
    event_length (e.at) AS length,
    e.title,
    (e.is_meeting
        AND (count(*) FILTER (WHERE ((a.response = 'accepted'::attendance)
            AND (e.account_id = a.account_id))) = 1)) AS is_meeting,
e.is_online,
e.is_onsite,
e.is_offsite,
count(*) FILTER (WHERE (a.response = 'accepted'::attendance)) AS attendee_count,
string_agg((a.account_id)::text, ','::text ORDER BY a.account_id) AS attendees,
count(*) AS invitee_count
FROM (event e
    JOIN attendee a ON (e.id = a.event_id))
GROUP BY
    e.id;

