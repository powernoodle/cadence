CREATE OR REPLACE FUNCTION public.update_credentials (account_id bigint, new_credentials jsonb)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE
        account
    SET
        credentials = new_credentials || credentials
    WHERE
        id = account_id;
END
$$;

