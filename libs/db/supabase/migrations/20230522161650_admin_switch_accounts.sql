CREATE OR REPLACE FUNCTION public.is_admin ()
    RETURNS boolean
    LANGUAGE plpgsql
    AS $function$
BEGIN
    IF auth.jwt () ->> 'email' LIKE '%@letscollide.io' THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$function$;

CREATE POLICY "Admins can read all accounts" ON "public"."account" AS permissive
    FOR SELECT TO authenticated
        USING (is_admin ());

CREATE POLICY "Admins can read all events" ON "public"."event" AS permissive
    FOR SELECT TO authenticated
        USING (is_admin ());

