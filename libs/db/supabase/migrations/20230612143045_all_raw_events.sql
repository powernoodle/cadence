ALTER TABLE "public"."raw_event"
    DROP CONSTRAINT "raw_events_pkey";

DROP INDEX IF EXISTS "public"."raw_events_pkey";

ALTER TABLE "public"."raw_event"
    ADD COLUMN "account_id" bigint;

ALTER TABLE "public"."raw_event"
    ADD COLUMN "created_at" timestamp with time zone DEFAULT now();

ALTER TABLE "public"."raw_event"
    ADD COLUMN "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL;

CREATE UNIQUE INDEX raw_event_pkey ON public.raw_event USING btree (id);

ALTER TABLE "public"."raw_event"
    ADD CONSTRAINT "raw_event_pkey" PRIMARY KEY USING INDEX "raw_event_pkey";

ALTER TABLE "public"."raw_event"
    ADD CONSTRAINT "raw_event_account_id_fkey" FOREIGN KEY (account_id) REFERENCES account (id) NOT valid;

ALTER TABLE "public"."raw_event" validate CONSTRAINT "raw_event_account_id_fkey";

UPDATE
    public.raw_event
SET
    account_id = event.account_id
FROM
    event
WHERE
    public.raw_event.account_id IS NULL
    AND public.raw_event.event_id = event.id;

ALTER TABLE "public"."raw_event" RENAME COLUMN "ical" TO "raw_event";

ALTER TABLE "public"."raw_event"
    ALTER COLUMN "event_id" DROP NOT NULL;

