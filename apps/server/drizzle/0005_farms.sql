CREATE TABLE "farm_members" (
	"farm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_by" uuid
);
--> statement-breakpoint
ALTER TABLE "farm_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"invite_code" char(5) NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farms_name_check" CHECK (char_length("farms"."name") between 1 and 40)
);
--> statement-breakpoint
ALTER TABLE "farms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nudges" (
	"from_user" uuid NOT NULL,
	"to_user" uuid NOT NULL,
	"day" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "nudges_from_user_to_user_day_pk" PRIMARY KEY("from_user","to_user","day")
);
--> statement-breakpoint
ALTER TABLE "nudges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reminder_time" text;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_from_user_profiles_id_fk" FOREIGN KEY ("from_user") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_to_user_profiles_id_fk" FOREIGN KEY ("to_user") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "farm_members_user_idx" ON "farm_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "farm_members_farm_idx" ON "farm_members" USING btree ("farm_id","joined_at");--> statement-breakpoint
CREATE INDEX "farm_members_invited_by_idx" ON "farm_members" USING btree ("invited_by");--> statement-breakpoint
CREATE UNIQUE INDEX "farms_invite_code_idx" ON "farms" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "nudges_to_day_idx" ON "nudges" USING btree ("to_user","day");