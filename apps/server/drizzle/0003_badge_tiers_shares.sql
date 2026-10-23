CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shares_channel_check" CHECK ("shares"."channel" in ('native', 'copy', 'image'))
);
--> statement-breakpoint
ALTER TABLE "shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "duels" ADD COLUMN "is_rematch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "duels" ADD COLUMN "comeback" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "used_notes" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "progress_version" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_badges" ADD COLUMN "tier" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_badges" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shares_user_game_idx" ON "shares" USING btree ("user_id","game_id");--> statement-breakpoint
-- Профили, минали през backfill v1 (значки + серия), са на версия 1; версия 2 добавя степените.
UPDATE "profiles" SET "progress_version" = 1 WHERE "progress_backfilled";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "progress_backfilled";--> statement-breakpoint
-- Старите значки без наследник (firstBull, chiefBull) и тези, които backfill v2 извлича наново от
-- историята (fiveDigits → five, streak7 → streak), се махат; noWaste и underMinute пазят earned_at
-- и получават степен 1, която backfill v2 само вдига.
DELETE FROM "user_badges" WHERE "badge_key" NOT IN ('noWaste', 'underMinute');--> statement-breakpoint
UPDATE "user_badges" SET "tier" = 1, "progress" = 1 WHERE "tier" = 0;
