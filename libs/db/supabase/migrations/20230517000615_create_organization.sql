CREATE OR REPLACE FUNCTION public.get_or_create_organization_id (email text)
    RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    domain_name text := lower(regexp_replace(split_part(email, '@', 2), '\s+', '', 'g'));
    org_id bigint;
BEGIN
    SELECT
        organization_id INTO org_id
    FROM
        DOMAIN
    WHERE
        DOMAIN = domain_name;
    IF FOUND THEN
        RETURN org_id;
    ELSE
        INSERT INTO organization (name)
            VALUES (domain_name)
        RETURNING
            id INTO org_id;
        INSERT INTO domain (organization_id, domain)
            VALUES (org_id, domain_name);
        RETURN org_id;
    END IF;
END;
$$;

CREATE FUNCTION public.link_account_to_organization ()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    UPDATE
        public.account
    SET
        organization_id = (
            SELECT
                public.get_or_create_organization_id (NEW.email))
    WHERE
        id = NEW.id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_account_created
    AFTER INSERT ON public.account
    FOR EACH ROW
    EXECUTE PROCEDURE public.link_account_to_organization ();

