ALTER TABLE "public"."account"
    ADD COLUMN "sync_error" text;

ALTER TABLE "public"."account"
    ADD COLUMN "sync_started_at" timestamp with time zone;

