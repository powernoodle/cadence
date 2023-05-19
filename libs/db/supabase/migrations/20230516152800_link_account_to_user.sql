CREATE OR REPLACE FUNCTION parse_provider (p_text_value text)
    RETURNS "public"."provider"
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN p_text_value::"public"."provider";
EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid provider value: %', p_text_value;
END;

$$;

-- inserts a row into public.account
CREATE OR REPLACE FUNCTION public.link_account_to_user ()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    INSERT INTO public.account (email, name, provider, user_id)
        VALUES (NEW.email, NEW.identity_data ->> 'name', parse_provider (NEW.provider), NEW.user_id)
    ON CONFLICT (email)
        DO UPDATE SET
            user_id = NEW.user_id, provider = parse_provider (NEW.provider), name = COALESCE(NEW.identity_data ->> 'name', account.name);
    RETURN new;
END;
$$;

-- trigger the function every time a user identity is created
CREATE TRIGGER on_auth_identity_created
    AFTER INSERT ON auth.identities
    FOR EACH ROW
    EXECUTE PROCEDURE public.link_account_to_user ();

