import { z } from "zod";

// Acepta URLs absolutas (R2) o relativas propias (/api/files/…).
export const imageUrlSchema = z
  .string()
  .min(1)
  .max(600)
  .refine(
    (value) => value.startsWith("/api/files/") || z.url().safeParse(value).success,
    { message: "URL de imagen inválida" }
  );

export const createProductSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  priceCents: z.number().int().min(1).max(100_000_000),
  imageUrl: imageUrlSchema.optional(),
  stock: z.number().int().min(0).max(1_000_000).default(10),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
