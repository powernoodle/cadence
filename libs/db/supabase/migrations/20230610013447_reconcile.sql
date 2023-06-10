drop function if exists "public"."foo"(num bigint);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.current_account_id()
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
DECLARE
  account_id INTEGER;
BEGIN
SELECT
        id into account_id
    FROM
        account
    WHERE
        user_id = auth.uid ();
  RETURN account_id;

END
$function$
;

CREATE OR REPLACE FUNCTION public.event_by_organizer(event_account_id bigint, during tstzrange)
 RETURNS TABLE(account_id bigint, id bigint, name text, email text, meeting_count integer, length_sum integer, cost integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF (NOT is_admin ())  AND (event_account_id <> current_account_id ()) 
        THEN
        RAISE EXCEPTION 'User cannot access other accounts';
    END IF;
    RETURN QUERY
    SELECT
        event_account_id AS account_id,
        a.account_id AS id,
        max(act.name) AS name,
        max(act.email) AS email,
        count(DISTINCT e.id)::int AS meeting_count,
        sum(event_length (e.at, during))::int AS length_sum,
        meeting_cost (sum(e.attendee_count)::int, sum(e.attendee_count * event_length (e.at, during))::int) AS "cost"
    FROM
        event_stats e
        JOIN attendee a ON (e.id = a.event_id)
        JOIN account act ON (a.account_id = act.id)
    WHERE
        a.is_organizer = TRUE
        AND e.is_meeting = TRUE
        AND e.account_id = event_account_id
        AND e.at && during
    GROUP BY
        a.account_id;
END
$function$
;

CREATE OR REPLACE FUNCTION public.get_accounts_for_user()
 RETURNS SETOF bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT DISTINCT a.account_id
FROM event e
JOIN attendee a on e.id = a.event_id
WHERE e.account_id = (SELECT id FROM account WHERE user_id = auth.uid());
$function$
;



