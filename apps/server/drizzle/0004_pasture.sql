CREATE TABLE "user_pasture" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"hidden_items" text[] DEFAULT '{}'::text[] NOT NULL,
	"barn_color" text DEFAULT 'red' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_pasture_barn_color_check" CHECK ("user_pasture"."barn_color" in ('red', 'blue', 'green', 'yellow', 'purple'))
);
--> statement-breakpoint
ALTER TABLE "user_pasture" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_pasture" ADD CONSTRAINT "user_pasture_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;