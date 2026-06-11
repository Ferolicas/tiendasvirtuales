import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orderItems, orders, products, stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { emitToStore } from "@/lib/realtime";

// Transiciones permitidas del ciclo de vida de un pedido. «paid» también
// lo marca Stripe vía webhook; aquí el dueño puede registrarlo a mano
// (cobro en efectivo) además de enviar o cancelar.
const TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

async function loadOwnedOrder(orderId: string, userId: string) {
  const [row] = await db
    .select({ order: orders, ownerId: stores.ownerId })
    .from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row || row.ownerId !== userId) return null;
  return row.order;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) {
    return new Response("Bad Request", { status: 400 });
  }

  const order = await loadOwnedOrder(orderId, session.user.id);
  if (!order) return new Response("Not Found", { status: 404 });

  const items = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      productName: products.name,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  return Response.json({ order, items });
}

const patchSchema = z.object({
  status: z.enum(["paid", "shipped", "cancelled"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`order-status:${clientIdentifier(req)}`, 30, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) {
    return new Response("Bad Request", { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const order = await loadOwnedOrder(orderId, session.user.id);
  if (!order) return new Response("Not Found", { status: 404 });

  if (!TRANSITIONS[order.status]?.includes(result.data.status)) {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }

  const [updated] = await db.transaction(async (tx) => {
    // Al cancelar, el stock de las líneas vuelve al catálogo.
    if (result.data.status === "cancelled") {
      const lines = await tx
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      for (const line of lines) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${line.quantity}` })
          .where(eq(products.id, line.productId));
      }
    }
    return tx
      .update(orders)
      .set({ status: result.data.status })
      .where(eq(orders.id, orderId))
      .returning();
  });

  emitToStore(updated.storeId, "order:update", {
    id: updated.id,
    status: updated.status,
  });

  return Response.json({ order: updated });
}
