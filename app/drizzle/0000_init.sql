CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."appearance_source" AS ENUM('photo', 'description');--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('generating', 'ready', 'approved', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."character_role" AS ENUM('hero', 'companion', 'guide');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('guardian', 'ai_processing', 'photo_retention', 'marketing', 'other_person_photo', 'save_hero');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('girl', 'boy');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'cancelled', 'refunded', 'in_production', 'shipped', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('pending', 'generating', 'ready', 'needs_review', 'failed');--> statement-breakpoint
CREATE TYPE "public"."photo_verdict" AS ENUM('good', 'ok', 'bad', 'rejected', 'pending');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'hero_approved', 'text_approved', 'generating', 'preview', 'approved_by_customer', 'paid', 'in_review', 'fixing', 'awaiting_customer', 'printing', 'shipped', 'delivered', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."story_path" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"params" jsonb,
	"prompt" text,
	"status" "ai_job_status" DEFAULT 'queued' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"error" text,
	"cost_micro_usd" integer,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"text" text,
	"illustration_key" text,
	"layout_id" text,
	"status" "page_status" DEFAULT 'pending' NOT NULL,
	"qa" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"edited_by_customer" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"style_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "card_status" DEFAULT 'generating' NOT NULL,
	"images" jsonb,
	"regeneration_reason" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"role" character_role NOT NULL,
	"kind" text,
	"name" text NOT NULL,
	"name_forms" jsonb,
	"name_indeclinable" boolean DEFAULT false NOT NULL,
	"gender" "gender",
	"age" integer,
	"story_role" text,
	"appearance_source" "appearance_source",
	"appearance" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"character_id" uuid,
	"type" "consent_type" NOT NULL,
	"granted" boolean NOT NULL,
	"text_key" text NOT NULL,
	"language" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "name_dictionary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language" text NOT NULL,
	"name" text NOT NULL,
	"gender" "gender" NOT NULL,
	"forms" jsonb NOT NULL,
	"declinable" boolean DEFAULT true NOT NULL,
	"diminutives" text[] DEFAULT '{}' NOT NULL,
	"base_name" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"book_version_id" uuid,
	"market" text NOT NULL,
	"currency" text NOT NULL,
	"variant" text NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"payment_method" text NOT NULL,
	"total_minor" integer NOT NULL,
	"price_breakdown" jsonb NOT NULL,
	"shipping" jsonb,
	"external_payment_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_external_payment_id_unique" UNIQUE("external_payment_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"storage_key" text,
	"verdict" "photo_verdict" DEFAULT 'pending' NOT NULL,
	"verdict_reason" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delete_after" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market" text NOT NULL,
	"book_language" text NOT NULL,
	"email" text,
	"access_token_hash" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"occasion" text,
	"story_path" "story_path",
	"story_id" uuid,
	"style_id" text,
	"layout_id" text,
	"format" text DEFAULT 'A5' NOT NULL,
	"binding" text DEFAULT 'hardcover' NOT NULL,
	"page_count" integer DEFAULT 32 NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"story_input" jsonb,
	"personal_texts" jsonb,
	"needs_language_review" boolean DEFAULT false NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"age_min" integer NOT NULL,
	"age_max" integer NOT NULL,
	"spreads" integer DEFAULT 12 NOT NULL,
	"styles" text[] DEFAULT '{}' NOT NULL,
	"companion_slots" integer DEFAULT 0 NOT NULL,
	"needs_guide" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "story_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"language" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"annotation" text NOT NULL,
	"development_goal" text,
	"author" text,
	"spreads" jsonb NOT NULL,
	"detail_slots" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_pages" ADD CONSTRAINT "book_pages_book_version_id_book_versions_id_fk" FOREIGN KEY ("book_version_id") REFERENCES "public"."book_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_versions" ADD CONSTRAINT "book_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_cards" ADD CONSTRAINT "character_cards_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_book_version_id_book_versions_id_fk" FOREIGN KEY ("book_version_id") REFERENCES "public"."book_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_editions" ADD CONSTRAINT "story_editions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_jobs_project_idx" ON "ai_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_jobs_status_idx" ON "ai_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "book_pages_version_idx" ON "book_pages" USING btree ("book_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "book_versions_project_ver_idx" ON "book_versions" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "character_cards_character_idx" ON "character_cards" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "characters_project_idx" ON "characters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "consents_project_idx" ON "consents" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "name_dictionary_lang_name_idx" ON "name_dictionary" USING btree ("language","name");--> statement-breakpoint
CREATE INDEX "orders_project_idx" ON "orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "photos_delete_after_idx" ON "photos" USING btree ("delete_after");--> statement-breakpoint
CREATE INDEX "projects_email_idx" ON "projects" USING btree ("email");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "story_editions_story_lang_ver_idx" ON "story_editions" USING btree ("story_id","language","version");