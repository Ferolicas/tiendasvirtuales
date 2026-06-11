import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orderItems, orders, products, stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { emitToOrder, emitToStore } from "@/lib/realtime";

// Ciclo v2 de la comanda: pending (sin pagar) → paid (entrante) →
// preparing (aceptado) → ready (en reparto / listo) → delivered.
// Los pedidos «pagar en tienda» pueden aceptarse aún pendientes de cobro.
// Cancelar: en todas las fases menos en reparto (regla del fundador).
const TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "preparing", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
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

const patchSchema = z
  .object({
    status: z.enum(["paid", "preparing", "ready", "delivered", "cancelled"]),
    reason: z.string().min(3).max(300).optional(),
  })
  .refine((o) => o.status !== "cancelled" || Boolean(o.reason), {
    message: "reason_required",
    path: ["reason"],
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

  const target = result.data.status;
  if (!TRANSITIONS[order.status]?.includes(target)) {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }
  // Aceptar sin cobrar solo aplica a «pagar en tienda».
  if (
    order.status === "pending" &&
    target === "preparing" &&
    order.paymentMethod !== "in_store"
  ) {
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  }

  const now = new Date();
  const patch: Partial<typeof orders.$inferInsert> = { status: target };
  if (target === "preparing") patch.acceptedAt = now;
  if (target === "ready") patch.readyAt = now;
  if (target === "delivered") patch.deliveredAt = now;
  if (target === "cancelled") patch.cancelReason = result.data.reason;

  const [updated] = await db.transaction(async (tx) => {
    const lines = await tx
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Al cancelar, el stock vuelve; al entregar, suma ventas por producto.
    if (target === "cancelled") {
      for (const line of lines) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${line.quantity}` })
          .where(
            and(eq(products.id, line.productId), eq(products.unlimitedStock, false))
          );
      }
    }
    if (target === "delivered") {
      for (const line of lines) {
        await tx
          .update(products)
          .set({ salesCount: sql`${products.salesCount} + ${line.quantity}` })
          .where(eq(products.id, line.productId));
      }
    }

    return tx
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId))
      .returning();
  });

  const event = {
    id: updated.id,
    status: updated.status,
    acceptedAt: updated.acceptedAt,
    readyAt: updated.readyAt,
    deliveredAt: updated.deliveredAt,
  };
  emitToStore(updated.storeId, "order:update", event);
  emitToOrder(updated.id, "order:update", event);

  return Response.json({ order: updated });
}
