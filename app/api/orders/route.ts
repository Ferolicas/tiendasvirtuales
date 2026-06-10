import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, products, stores } from "@/lib/db/schema";
import { createOrderSchema } from "@/lib/validations/order";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { emitToStore } from "@/lib/realtime";

// Endpoint público: lo usan los compradores de las tiendas. El total se
// calcula SIEMPRE con los precios de la base de datos, nunca con los del
// cliente. v1 crea el pedido en estado "pending"; el cobro con Stripe
// Connect se integra en la fase de refinamiento.
export async function POST(req: Request) {
  if (!rateLimit(`orders:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const result = createOrderSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }
  const { storeId, customerName, customerEmail, items } = result.data;

  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store) {
    return Response.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  const productIds = items.map((i) => i.productId);
  const found = await db
    .select()
    .from(products)
    .where(
      and(
        inArray(products.id, productIds),
        eq(products.storeId, storeId),
        eq(products.active, true)
      )
    );
  if (found.length !== new Set(productIds).size) {
    return Response.json(
      { error: "Algún producto no existe en esta tienda" },
      { status: 400 }
    );
  }

  const priceById = new Map(found.map((p) => [p.id, p.priceCents]));
  const totalCents = items.reduce(
    (sum, i) => sum + (priceById.get(i.productId) ?? 0) * i.quantity,
    0
  );

  const order = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orders)
      .values({ storeId, customerName, customerEmail, totalCents })
      .returning();
    await tx.insert(orderItems).values(
      items.map((i) => ({
        orderId: created.id,
        productId: i.productId,
        quantity: i.quantity,
        unitPriceCents: priceById.get(i.productId) ?? 0,
      }))
    );
    return created;
  });

  emitToStore(storeId, "order:new", {
    id: order.id,
    customerName: order.customerName,
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt,
  });

  return Response.json({ order: { id: order.id, status: order.status } }, {
    status: 201,
  });
}
