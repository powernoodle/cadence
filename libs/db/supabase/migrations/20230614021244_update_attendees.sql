drop function if exists "public"."update_attendees"(event_id bigint, attendees raw_attendee[]);

drop index if exists "public"."attendee_pkey";

CREATE UNIQUE INDEX attendee_pkey ON public.attendee USING btree (event_id, account_id);

alter table "public"."attendee" add constraint "attendee_pkey" PRIMARY KEY using index "attendee_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_attendees(this_event_id bigint, attendees raw_attendee[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    acc_id bigint;
BEGIN
    FOR i IN array_lower(attendees, 1) .. array_upper(attendees, 1)
    LOOP
        -- Insert/Update attendee email and name in the account table
        INSERT INTO account (email, name)
        VALUES (attendees[i].email, attendees[i].name)
        ON CONFLICT (email) DO
            UPDATE SET name = COALESCE(account.name, excluded.name)
        RETURNING id INTO acc_id;
        
        -- Insert/Update attendee information in the attendee table
        INSERT INTO attendee (event_id, account_id, response, is_organizer)
        VALUES (this_event_id, acc_id, attendees[i].response, attendees[i].is_organizer)
        ON CONFLICT (event_id, account_id) DO
            UPDATE SET response = excluded.response, is_organizer = excluded.is_organizer;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.event_count_by_account()
 RETURNS TABLE(account_id bigint, event_count integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        e.account_id as account_id,
        count(DISTINCT id)::int AS event_count
    FROM event_stats e
    GROUP BY e.account_id;
END
$function$
;

CREATE OR REPLACE FUNCTION public.link_series(account_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
UPDATE event SET series = subquery.series
FROM (
    SELECT ARRAY_AGG(id), MAX(series) as series
    FROM event_stats
    WHERE event_stats.account_id = $1
    GROUP BY title, attendees
    HAVING COUNT(*) > 1
) AS subquery
WHERE event.id = ANY(subquery.array_agg);
END;
$function$
;



