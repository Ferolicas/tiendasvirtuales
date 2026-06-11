import { z } from "zod";
import { imageUrlSchema } from "@/lib/validations/product";
import { STORE_CATEGORIES } from "@/lib/verticals";

export const BANNER_PRESETS = [
  "comidas",
  "ropa",
  "tecnologia",
  "deportes",
  "finanzas",
  "belleza",
] as const;

export const storeHoursSchema = z
  .array(
    z.object({
      days: z.string().regex(/^(all|weekdays|weekend|[0-6])$/),
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
    })
  )
  .max(14);

export const createStoreSchema = z.object({
  name: z.string().min(2).max(80),
  storeCategory: z.enum(STORE_CATEGORIES),
  description: z.string().max(500).optional(),
  currency: z.enum(["EUR", "USD", "COP", "MXN"]).default("EUR"),
  logoUrl: imageUrlSchema.optional(),
  bannerUrl: imageUrlSchema.optional(),
  bannerPreset: z.enum(BANNER_PRESETS).optional(),
  schedule: z.string().max(500).optional(),
  hours: storeHoursSchema.nullable().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  pickupEnabled: z.boolean().default(false),
  legalName: z.string().max(200).optional(),
  legalTaxId: z.string().max(50).optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
