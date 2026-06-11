import { z } from "zod";
import { imageUrlSchema } from "@/lib/validations/product";

export const BANNER_PRESETS = [
  "comidas",
  "ropa",
  "tecnologia",
  "deportes",
  "finanzas",
  "belleza",
] as const;

export const createStoreSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  currency: z.enum(["EUR", "USD", "COP", "MXN"]).default("EUR"),
  logoUrl: imageUrlSchema.optional(),
  bannerUrl: imageUrlSchema.optional(),
  bannerPreset: z.enum(BANNER_PRESETS).optional(),
  schedule: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  pickupEnabled: z.boolean().default(false),
  legalName: z.string().max(200).optional(),
  legalTaxId: z.string().max(50).optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
