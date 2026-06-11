ALTER TABLE "stores" ADD COLUMN "store_category" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "charges_enabled" boolean DEFAULT false NOT NULL;