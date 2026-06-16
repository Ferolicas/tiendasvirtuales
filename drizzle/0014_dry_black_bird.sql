CREATE TYPE "public"."user_role" AS ENUM('vendor', 'customer');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'vendor' NOT NULL;