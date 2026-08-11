CREATE TYPE "public"."settled_by" AS ENUM('auto', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tip_market" AS ENUM('home_win', 'draw', 'away_win', 'over_25', 'under_25', 'btts_yes', 'btts_no');--> statement-breakpoint
CREATE TYPE "public"."tip_status" AS ENUM('draft', 'published');--> statement-breakpoint
ALTER TABLE "tips" ALTER COLUMN "odds" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "home_score" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "away_score" integer;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "status" "tip_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "market" "tip_market";--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "probability" integer;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "settled_by" "settled_by";--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_external_id_unique" UNIQUE("external_id");