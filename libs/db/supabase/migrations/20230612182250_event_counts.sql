ALTER TABLE "public"."account"
    ADD COLUMN "sync_progress" real;

ALTER TABLE "public"."account"
    ADD COLUMN "synced_at" timestamp with time zone;

ALTER TABLE "public"."raw_event"
    ALTER COLUMN "raw_event" SET NOT NULL;

SET check_function_bodies = OFF;

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

