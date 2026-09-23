CREATE TYPE "public"."name_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "name_review_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"character_id" uuid,
	"language" text NOT NULL,
	"name" text NOT NULL,
	"gender" "gender" NOT NULL,
	"proposed_forms" jsonb NOT NULL,
	"customer_forms" jsonb,
	"declinable" boolean DEFAULT true NOT NULL,
	"status" "name_review_status" DEFAULT 'pending' NOT NULL,
	"approved_forms" jsonb,
	"approved_declinable" boolean,
	"reviewer" text,
	"note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "name_dictionary_lang_name_idx";--> statement-breakpoint
ALTER TABLE "name_dictionary" ADD COLUMN "name_days" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "name_dictionary" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "name_review_tasks" ADD CONSTRAINT "name_review_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_review_tasks" ADD CONSTRAINT "name_review_tasks_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "name_review_tasks_status_idx" ON "name_review_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "name_review_tasks_project_idx" ON "name_review_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "name_review_tasks_name_idx" ON "name_review_tasks" USING btree ("language","name","gender");--> statement-breakpoint
CREATE UNIQUE INDEX "name_dictionary_lang_name_gender_idx" ON "name_dictionary" USING btree ("language","name","gender");