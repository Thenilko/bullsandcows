CREATE TABLE "weekly" (
	"week_id" text PRIMARY KEY NOT NULL,
	"rule_key" text NOT NULL,
	"secret" text NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	"participants" integer,
	CONSTRAINT "weekly_week_id_check" CHECK ("weekly"."week_id" ~ '^[0-9]{4}-W[0-9]{2}$'),
	CONSTRAINT "weekly_rule_key_check" CHECK ("weekly"."rule_key" in ('fiveZero', 'threeNoZero', 'quickFour', 'fourZero'))
);
--> statement-breakpoint
ALTER TABLE "weekly" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weekly_plays" (
	"user_id" uuid NOT NULL,
	"week_id" text NOT NULL,
	"day" date NOT NULL,
	"game_id" uuid PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"secs" integer,
	"won" boolean DEFAULT false NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weekly_plays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weekly_results" (
	"week_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"place" integer,
	"participants" integer NOT NULL,
	"won" boolean NOT NULL,
	"attempts" integer,
	"secs" integer,
	"xp" integer DEFAULT 0 NOT NULL,
	"gold_frame" boolean DEFAULT false NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_results_week_id_user_id_pk" PRIMARY KEY("week_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "weekly_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "games_kind_check";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "gold_frame_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "weekly_plays" ADD CONSTRAINT "weekly_plays_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plays" ADD CONSTRAINT "weekly_plays_week_id_weekly_week_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weekly"("week_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plays" ADD CONSTRAINT "weekly_plays_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_results" ADD CONSTRAINT "weekly_results_week_id_weekly_week_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weekly"("week_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_results" ADD CONSTRAINT "weekly_results_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weekly_due_idx" ON "weekly" USING btree ("ends_at") WHERE "weekly"."finalized_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_plays_user_day_idx" ON "weekly_plays" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "weekly_plays_week_idx" ON "weekly_plays" USING btree ("week_id","user_id");--> statement-breakpoint
CREATE INDEX "weekly_results_user_idx" ON "weekly_results" USING btree ("user_id","week_id");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_kind_check" CHECK ("games"."kind" in ('daily', 'free', 'duel_race', 'duel_classic', 'bot', 'weekly'));