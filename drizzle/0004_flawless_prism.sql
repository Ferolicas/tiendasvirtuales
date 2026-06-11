ALTER TABLE "stores" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "domain_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_custom_domain_unique" UNIQUE("custom_domain");