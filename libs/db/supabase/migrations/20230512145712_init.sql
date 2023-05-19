CREATE TYPE "public"."attendance" AS enum (
    'accepted',
    'declined',
    'tentative'
);

CREATE TYPE "public"."provider" AS enum (
    'google',
    'azure'
);

CREATE TABLE "public"."attendee" (
    "event_id" bigint NOT NULL,
    "account_id" bigint NOT NULL,
    "response" attendance,
    "is_organizer" boolean NOT NULL DEFAULT FALSE
);

ALTER TABLE "public"."attendee" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."calendar" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "calendar_id" text NOT NULL,
    "organization_id" bigint,
    "name" text NOT NULL,
    "provider" provider NOT NULL
);

ALTER TABLE "public"."calendar" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."calendar_events" (
    "synced_at" timestamp with time zone NOT NULL DEFAULT now(),
    "calendar_id" bigint NOT NULL,
    "event_id" bigint NOT NULL
);

ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."event" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "uid" text NOT NULL,
    "recurrence_id" text,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone,
    "length" smallint,
    "title" text,
    "is_meeting" boolean NOT NULL DEFAULT FALSE,
    "is_online" boolean NOT NULL DEFAULT FALSE,
    "is_onsite" boolean NOT NULL DEFAULT FALSE,
    "is_offsite" boolean NOT NULL DEFAULT FALSE,
    "raw" jsonb
);

ALTER TABLE "public"."event" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."domain" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "domain" text NOT NULL,
    "organization_id" bigint
);

ALTER TABLE "public"."domain" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."organization" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "name" text
);

ALTER TABLE "public"."organization" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."account" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "email" text NOT NULL,
    "name" text,
    "organization_id" bigint,
    "user_id" uuid REFERENCES auth.users ON DELETE SET NULL,
    "provider" provider,
    "credentials" jsonb
);

ALTER TABLE "public"."account" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."account_calendars" (
    "created_at" timestamp with time zone DEFAULT now(),
    "account_id" bigint NOT NULL,
    "calendar_id" bigint NOT NULL
);

ALTER TABLE "public"."account_calendars" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX calendar_events_pkey ON public.calendar_events USING btree (calendar_id, event_id);

CREATE UNIQUE INDEX calendar_pkey ON public.calendar USING btree (id);

CREATE UNIQUE INDEX event_pkey ON public.event USING btree (id);

CREATE UNIQUE INDEX event_uid_recurrence_id_key ON public.event USING btree (uid, recurrence_id) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX organization_pkey ON public.organization USING btree (id);

CREATE UNIQUE INDEX account_calendars_pkey ON public.account_calendars USING btree (account_id, calendar_id);

CREATE UNIQUE INDEX account_pkey ON public.account USING btree (id);

CREATE UNIQUE INDEX account_email_key ON public.account USING btree (email);

CREATE UNIQUE INDEX domain_key ON public.domain USING btree (DOMAIN);

ALTER TABLE "public"."calendar"
    ADD CONSTRAINT "calendar_pkey" PRIMARY KEY USING INDEX "calendar_pkey";

ALTER TABLE "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY USING INDEX "calendar_events_pkey";

ALTER TABLE "public"."event"
    ADD CONSTRAINT "event_pkey" PRIMARY KEY USING INDEX "event_pkey";

ALTER TABLE "public"."organization"
    ADD CONSTRAINT "organization_pkey" PRIMARY KEY USING INDEX "organization_pkey";

ALTER TABLE "public"."attendee"
    ADD CONSTRAINT "attendee_event_id_fkey" FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."attendee" validate CONSTRAINT "attendee_event_id_fkey";

ALTER TABLE "public"."attendee"
    ADD CONSTRAINT "attendee_account_id_fkey" FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."attendee" validate CONSTRAINT "attendee_account_id_fkey";

ALTER TABLE "public"."calendar"
    ADD CONSTRAINT "calendar_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE RESTRICT NOT valid;

ALTER TABLE "public"."calendar" validate CONSTRAINT "calendar_organization_id_fkey";

ALTER TABLE "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_calendar_id_fkey" FOREIGN KEY (calendar_id) REFERENCES calendar (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."calendar_events" validate CONSTRAINT "calendar_events_calendar_id_fkey";

ALTER TABLE "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_event_id_fkey" FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."calendar_events" validate CONSTRAINT "calendar_events_event_id_fkey";

ALTER TABLE "public"."account"
    ADD CONSTRAINT "account_pkey" PRIMARY KEY USING INDEX "account_pkey";

ALTER TABLE "public"."account_calendars"
    ADD CONSTRAINT "account_calendars_pkey" PRIMARY KEY USING INDEX "account_calendars_pkey";

ALTER TABLE "public"."account"
    ADD CONSTRAINT "account_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE SET NULL NOT valid;

ALTER TABLE "public"."account" validate CONSTRAINT "account_organization_id_fkey";

ALTER TABLE "public"."account" validate CONSTRAINT "account_user_id_fkey";

ALTER TABLE "public"."account_calendars"
    ADD CONSTRAINT "account_calendars_account_id_fkey" FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."account_calendars" validate CONSTRAINT "account_calendars_account_id_fkey";

ALTER TABLE "public"."account_calendars"
    ADD CONSTRAINT "account_calendars_calendar_id_fkey" FOREIGN KEY (calendar_id) REFERENCES calendar (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."account_calendars" validate CONSTRAINT "account_calendars_calendar_id_fkey";

SET check_function_bodies = OFF;

CREATE OR REPLACE FUNCTION public.delete_unreferenced_event ()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
BEGIN
    DELETE FROM events
    WHERE id = OLD.event_id
        AND NOT EXISTS (
            SELECT
                1
            FROM
                calendar_events
            WHERE
                event_id = OLD.event_id);
    RETURN old;
END;
$function$;

CREATE TRIGGER delete_unreferenced_event_trigger
    AFTER DELETE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION delete_unreferenced_event ();

