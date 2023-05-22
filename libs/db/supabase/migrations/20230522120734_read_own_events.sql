CREATE POLICY "Users can read their own accounts" ON "public"."account" AS permissive
    FOR SELECT TO authenticated
        USING ((auth.uid () = user_id));

CREATE POLICY "Users can read their own events" ON "public"."event" AS permissive
    FOR SELECT TO authenticated
        USING ((auth.uid () IN (
            SELECT
                account.user_id
            FROM
                account
            WHERE (account.id = event.account_id))));

