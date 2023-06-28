ALTER TABLE "public"."raw_event"
    DROP CONSTRAINT "raw_event_account_id_fkey";

ALTER TABLE "public"."raw_event"
    ADD CONSTRAINT "raw_event_account_id_fkey" FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."raw_event" validate CONSTRAINT "raw_event_account_id_fkey";

