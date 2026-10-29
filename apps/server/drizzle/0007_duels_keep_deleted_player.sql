ALTER TABLE "duels" DROP CONSTRAINT "duels_player_a_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "duels" ALTER COLUMN "player_a" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_player_a_profiles_id_fk" FOREIGN KEY ("player_a") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;