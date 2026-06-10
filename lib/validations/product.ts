import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  priceCents: z.number().int().min(1).max(100_000_000),
  imageUrl: z.url().optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
