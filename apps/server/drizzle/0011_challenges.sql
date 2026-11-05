CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"format" text NOT NULL,
	"len" smallint NOT NULL,
	"zero" boolean NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "challenges_format_check" CHECK ("challenges"."format" in ('race', 'classic')),
	CONSTRAINT "challenges_status_check" CHECK ("challenges"."status" in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
	CONSTRAINT "challenges_len_check" CHECK ("challenges"."len" between 3 and 5)
);
--> statement-breakpoint
ALTER TABLE "challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_from_id_profiles_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_to_id_profiles_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenges_to_status_idx" ON "challenges" USING btree ("to_id","status");--> statement-breakpoint
CREATE INDEX "challenges_from_to_idx" ON "challenges" USING btree ("from_id","to_id");