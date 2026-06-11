import { z } from "zod";

export const createOrderSchema = z
  .object({
    storeId: z.uuid(),
    customerName: z.string().min(2).max(100),
    customerEmail: z.email(),
    customerPhone: z.string().min(6).max(30),
    fulfillment: z.enum(["delivery", "pickup"]).default("delivery"),
    deliveryAddress: z.string().min(5).max(300).optional(),
    paymentMethod: z.enum(["card", "in_store"]).default("card"),
    items: z
      .array(
        z.object({
          productId: z.uuid(),
          quantity: z.number().int().min(1).max(99),
        })
      )
      .min(1)
      .max(50),
  })
  .refine(
    (o) => o.fulfillment !== "delivery" || Boolean(o.deliveryAddress),
    { message: "delivery_address_required", path: ["deliveryAddress"] }
  );
// «in_store» = pago al recibir: en tienda (recogida) o en efectivo al
// repartidor (domicilio). Ambos entran directos a la comanda.

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
