import { z } from "zod";

export const createStoreSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  currency: z.enum(["EUR", "USD", "COP", "MXN"]).default("EUR"),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
