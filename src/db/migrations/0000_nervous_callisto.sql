CREATE TYPE "public"."analysis_scope" AS ENUM('canvas', 'session');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."canvas_kind" AS ENUM('participant', 'facilitator', 'consolidated');--> statement-breakpoint
CREATE TYPE "public"."canvas_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."llm_provider" AS ENUM('anthropic', 'openai', 'ollama');--> statement-breakpoint
CREATE TYPE "public"."module_key" AS ENUM('customer_segments', 'value_propositions', 'channels', 'customer_relationships', 'revenue_streams', 'key_resources', 'key_activities', 'key_partnerships', 'cost_structure');--> statement-breakpoint
CREATE TYPE "public"."note_color" AS ENUM('yellow', 'blue', 'teal', 'pink', 'green', 'orange');--> statement-breakpoint
CREATE TYPE "public"."participant_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."theme_key" AS ENUM('principal', 'oscuro', 'creativo');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('facilitator', 'participant');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"theme" "theme_key" DEFAULT 'principal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" "participant_status" DEFAULT 'invited' NOT NULL,
	"temp_password_ciphertext" text,
	"credentials_issued_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facilitator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canvas_id" uuid NOT NULL,
	"module_key" "module_key" NOT NULL,
	"order_index" smallint NOT NULL,
	"note_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"owner_id" uuid,
	"kind" "canvas_kind" NOT NULL,
	"title" text NOT NULL,
	"status" "canvas_status" DEFAULT 'not_started' NOT NULL,
	"note_count" integer DEFAULT 0 NOT NULL,
	"filled_modules" smallint DEFAULT 0 NOT NULL,
	"content_hash" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sticky_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canvas_id" uuid NOT NULL,
	"canvas_module_id" uuid NOT NULL,
	"module_key" "module_key" NOT NULL,
	"author_id" uuid,
	"text" text NOT NULL,
	"color" "note_color" DEFAULT 'yellow' NOT NULL,
	"position_x" real DEFAULT 0 NOT NULL,
	"position_y" real DEFAULT 0 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sticky_notes_text_len" CHECK (char_length("sticky_notes"."text") <= 500),
	CONSTRAINT "sticky_notes_position_range" CHECK ("sticky_notes"."position_x" >= 0 and "sticky_notes"."position_x" <= 1 and "sticky_notes"."position_y" >= 0 and "sticky_notes"."position_y" <= 1)
);
--> statement-breakpoint
CREATE TABLE "llm_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" "llm_provider" DEFAULT 'anthropic' NOT NULL,
	"model" text NOT NULL,
	"base_url" text,
	"api_key_ciphertext" text,
	"api_key_last4" text,
	"max_output_tokens" integer DEFAULT 1500 NOT NULL,
	"custom_instructions" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"last_tested_at" timestamp with time zone,
	"last_test_ok" boolean,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "analysis_scope" NOT NULL,
	"canvas_id" uuid,
	"training_session_id" uuid NOT NULL,
	"requested_by" uuid,
	"content_hash" text NOT NULL,
	"provider" "llm_provider" NOT NULL,
	"model" text NOT NULL,
	"status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"score" smallint,
	"input_tokens" integer,
	"output_tokens" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canvas_analyses_score_range" CHECK ("canvas_analyses"."score" is null or ("canvas_analyses"."score" between 0 and 100))
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"training_session_id" uuid NOT NULL,
	"canvas_id" uuid,
	"actor_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_participants" ADD CONSTRAINT "training_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_facilitator_id_profiles_id_fk" FOREIGN KEY ("facilitator_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_modules" ADD CONSTRAINT "canvas_modules_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticky_notes" ADD CONSTRAINT "sticky_notes_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticky_notes" ADD CONSTRAINT "sticky_notes_canvas_module_id_canvas_modules_id_fk" FOREIGN KEY ("canvas_module_id") REFERENCES "public"."canvas_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticky_notes" ADD CONSTRAINT "sticky_notes_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_settings" ADD CONSTRAINT "llm_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_settings" ADD CONSTRAINT "llm_settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_analyses" ADD CONSTRAINT "canvas_analyses_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_analyses" ADD CONSTRAINT "canvas_analyses_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_analyses" ADD CONSTRAINT "canvas_analyses_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_org_username_uq" ON "profiles" USING btree ("organization_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_org_email_uq" ON "profiles" USING btree ("organization_id","email") WHERE "profiles"."email" is not null;--> statement-breakpoint
CREATE INDEX "profiles_org_role_idx" ON "profiles" USING btree ("organization_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "training_participants_session_profile_uq" ON "training_participants" USING btree ("training_session_id","profile_id");--> statement-breakpoint
CREATE INDEX "training_participants_session_status_idx" ON "training_participants" USING btree ("training_session_id","status");--> statement-breakpoint
CREATE INDEX "training_sessions_org_status_idx" ON "training_sessions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_modules_canvas_key_uq" ON "canvas_modules" USING btree ("canvas_id","module_key");--> statement-breakpoint
CREATE UNIQUE INDEX "canvases_session_owner_kind_uq" ON "canvases" USING btree ("training_session_id","owner_id","kind");--> statement-breakpoint
CREATE INDEX "canvases_session_activity_idx" ON "canvases" USING btree ("training_session_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "sticky_notes_canvas_updated_idx" ON "sticky_notes" USING btree ("canvas_id","updated_at");--> statement-breakpoint
CREATE INDEX "sticky_notes_module_order_idx" ON "sticky_notes" USING btree ("canvas_module_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_settings_org_uq" ON "llm_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_analyses_reuse_uq" ON "canvas_analyses" USING btree ("scope","canvas_id","training_session_id","content_hash") WHERE "canvas_analyses"."status" = 'completed';--> statement-breakpoint
CREATE INDEX "canvas_analyses_canvas_created_idx" ON "canvas_analyses" USING btree ("canvas_id","created_at");--> statement-breakpoint
CREATE INDEX "canvas_analyses_requester_created_idx" ON "canvas_analyses" USING btree ("requested_by","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_session_id_idx" ON "activity_events" USING btree ("training_session_id","id");--> statement-breakpoint
CREATE INDEX "activity_events_canvas_id_idx" ON "activity_events" USING btree ("canvas_id","id");