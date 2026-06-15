ALTER TABLE "orders" ADD COLUMN "mp_payment_id" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_user_id" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_access_token" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_refresh_token" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_public_key" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "mp_connected" boolean DEFAULT false NOT NULL;