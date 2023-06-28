ALTER TABLE "public"."account"
    DROP CONSTRAINT "account_user_id_fkey";

ALTER TABLE "public"."account"
    ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE NOT valid;

ALTER TABLE "public"."account" validate CONSTRAINT "account_user_id_fkey";

