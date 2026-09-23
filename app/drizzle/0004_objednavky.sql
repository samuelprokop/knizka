ALTER TYPE "public"."consent_type" ADD VALUE 'terms';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "personal_token" text DEFAULT gen_random_uuid()::text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_personal_token_unique" UNIQUE("personal_token");