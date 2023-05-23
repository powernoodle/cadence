DROP VIEW IF EXISTS "public"."event_length";

DROP VIEW IF EXISTS "public"."event_series";

DROP VIEW IF EXISTS "public"."organizer";

DROP VIEW IF EXISTS "public"."event_stats";

CREATE TABLE "public"."raw_event" (
    "ical" jsonb,
    "event_id" bigint NOT NULL
);

ALTER TABLE "public"."raw_event" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event"
    DROP COLUMN "raw";

CREATE UNIQUE INDEX raw_events_pkey ON public.raw_event USING btree (event_id);

ALTER TABLE "public"."raw_event"
    ADD CONSTRAINT "raw_events_pkey" PRIMARY KEY USING INDEX "raw_events_pkey";

ALTER TABLE "public"."raw_event"
    ADD CONSTRAINT "raw_event_event_id_fkey" FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."raw_event" validate CONSTRAINT "raw_event_event_id_fkey";

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
    count(*) AS attendee_count
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
    sum(e.length) AS length_sum,
    meeting_cost (count(DISTINCT e.id), (sum(e.attendee_count))::integer, sum(e.length)) AS "cost"
FROM ((event_stats e
        JOIN attendee a ON (e.id = a.event_id))
    JOIN account act ON (a.account_id = act.id))
WHERE ((a.is_organizer = TRUE)
    AND (e.is_meeting = TRUE))
GROUP BY
    e.account_id,
    a.account_id;

CREATE OR REPLACE VIEW "public"."event_length" AS
SELECT
    e.account_id,
    e.length,
    count(DISTINCT e.id) AS meeting_count,
    sum(e.length) AS length_sum,
    meeting_cost (count(DISTINCT e.id), (sum(e.attendee_count))::integer, sum(e.length)) AS "cost"
FROM (event_stats e
    JOIN attendee a ON (e.id = a.event_id))
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
    event_stats.series,
    event_stats.cal_id;

