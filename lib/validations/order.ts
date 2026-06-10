import { z } from "zod";

export const createOrderSchema = z.object({
  storeId: z.uuid(),
  customerName: z.string().min(2).max(100),
  customerEmail: z.email(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
