ALTER TABLE "profiles" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_activity" text;--> statement-breakpoint
CREATE INDEX "profiles_last_seen_idx" ON "profiles" USING btree ("last_seen_at");