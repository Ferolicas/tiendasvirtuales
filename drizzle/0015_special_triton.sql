ALTER TABLE "stores" ALTER COLUMN "currency" SET DEFAULT 'COP';--> statement-breakpoint
UPDATE "stores" SET "currency" = 'COP' WHERE "currency" = 'EUR';