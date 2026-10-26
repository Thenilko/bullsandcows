CREATE TABLE "daily_numbers" (
	"date" date NOT NULL,
	"len" smallint NOT NULL,
	"zero" boolean NOT NULL,
	"idx" integer NOT NULL,
	CONSTRAINT "daily_numbers_date_len_zero_pk" PRIMARY KEY("date","len","zero")
);
--> statement-breakpoint
ALTER TABLE "daily_numbers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "duels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"format" text NOT NULL,
	"len" smallint NOT NULL,
	"zero" boolean NOT NULL,
	"opponent_kind" text NOT NULL,
	"bot_level" smallint,
	"invite_code" text,
	"player_a" uuid NOT NULL,
	"player_b" uuid,
	"game_a" uuid,
	"game_b" uuid,
	"winner" uuid,
	"outcome" text,
	"rating_delta_a" double precision,
	"rating_delta_b" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"rewards_applied" boolean DEFAULT false NOT NULL,
	CONSTRAINT "duels_format_check" CHECK ("duels"."format" in ('race', 'classic')),
	CONSTRAINT "duels_opponent_kind_check" CHECK ("duels"."opponent_kind" in ('quick', 'friend', 'bot')),
	CONSTRAINT "duels_len_check" CHECK ("duels"."len" between 3 and 5)
);
--> statement-breakpoint
ALTER TABLE "duels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"len" smallint NOT NULL,
	"zero" boolean NOT NULL,
	"secret" text NOT NULL,
	"daily_date" date,
	"practice" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"wasted" integer DEFAULT 0 NOT NULL,
	"won" boolean,
	"score" integer DEFAULT 0 NOT NULL,
	"suspicious" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_kind_check" CHECK ("games"."kind" in ('daily', 'free', 'duel_race', 'duel_classic', 'bot')),
	CONSTRAINT "games_len_check" CHECK ("games"."len" between 3 and 5)
);
--> statement-breakpoint
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guesses" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guesses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"guess" text NOT NULL,
	"bulls" smallint NOT NULL,
	"cows" smallint NOT NULL,
	"consistent" boolean NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"username_lower" text NOT NULL,
	"email" text,
	"is_guest" boolean DEFAULT false NOT NULL,
	"lang" text DEFAULT 'bg' NOT NULL,
	"sound" boolean DEFAULT true NOT NULL,
	"vibrate" boolean DEFAULT true NOT NULL,
	"default_len" smallint DEFAULT 4 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"rating" double precision DEFAULT 1500 NOT NULL,
	"rating_dev" double precision DEFAULT 350 NOT NULL,
	"volatility" double precision DEFAULT 0.06 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_lang_check" CHECK ("profiles"."lang" in ('bg', 'en')),
	CONSTRAINT "profiles_default_len_check" CHECK ("profiles"."default_len" between 3 and 5)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_player_a_profiles_id_fk" FOREIGN KEY ("player_a") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_player_b_profiles_id_fk" FOREIGN KEY ("player_b") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_game_a_games_id_fk" FOREIGN KEY ("game_a") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_game_b_games_id_fk" FOREIGN KEY ("game_b") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "duels_invite_code_idx" ON "duels" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "games_user_created_idx" ON "games" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "games_daily_idx" ON "games" USING btree ("kind","len","zero","daily_date","won");--> statement-breakpoint
CREATE INDEX "games_finished_idx" ON "games" USING btree ("kind","len","zero","finished_at","won");--> statement-breakpoint
CREATE UNIQUE INDEX "games_daily_counted_idx" ON "games" USING btree ("user_id","daily_date","len","zero") WHERE "games"."kind" = 'daily' and not "games"."practice";--> statement-breakpoint
CREATE INDEX "guesses_game_idx" ON "guesses" USING btree ("game_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "guesses_game_guess_idx" ON "guesses" USING btree ("game_id","guess");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_lower_idx" ON "profiles" USING btree ("username_lower");