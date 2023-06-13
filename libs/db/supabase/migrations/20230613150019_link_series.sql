ALTER TABLE "public"."event"
    ALTER COLUMN "series" SET NOT NULL;

SET check_function_bodies = OFF;

CREATE OR REPLACE FUNCTION public.link_series (account_id bigint)
    RETURNS void
    LANGUAGE plpgsql
    AS $function$
BEGIN
    UPDATE
        event
    SET
        series = subquery.series
    FROM (
        SELECT
            ARRAY_AGG(id),
            MAX(series) AS series
        FROM
            event_stats
        WHERE
            event_stats.account_id = $1
        GROUP BY
            title,
            attendees
        HAVING
            COUNT(*) > 1) AS subquery
WHERE
    event.id = ANY (subquery.array_agg);
END;
$function$;

CREATE OR REPLACE FUNCTION public.event_count_by_account ()
    RETURNS TABLE (
        account_id bigint,
        event_count integer)
    LANGUAGE plpgsql
    AS $function$
BEGIN
    RETURN QUERY
    SELECT
        e.account_id AS account_id,
        count(DISTINCT id)::int AS event_count
    FROM
        event_stats e
    GROUP BY
        e.account_id;
END
$function$;

