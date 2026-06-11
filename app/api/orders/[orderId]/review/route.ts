import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, reviews, stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(600).optional(),
});

// Valoración pública del pedido: el id del pedido (uuid solo conocido por
// el comprador) actúa de credencial. Solo pedidos entregados, una vez.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!rateLimit(`review:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) {
    return new Response("Bad Request", { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const result = reviewSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return new Response("Not Found", { status: 404 });
  if (order.status !== "delivered" && order.status !== "shipped") {
    return Response.json({ error: "not_delivered" }, { status: 409 });
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(reviews).values({
        storeId: order.storeId,
        orderId: order.id,
        rating: result.data.rating,
        comment: result.data.comment,
        customerName: order.customerName,
      });
      await tx
        .update(stores)
        .set({
          ratingSum: sql`${stores.ratingSum} + ${result.data.rating}`,
          ratingCount: sql`${stores.ratingCount} + 1`,
        })
        .where(eq(stores.id, order.storeId));
    });
  } catch {
    // unique(order_id): ya valorado
    return Response.json({ error: "already_reviewed" }, { status: 409 });
  }

  return Response.json({ ok: true }, { status: 201 });
}

// El dueño puede eliminar una reseña (spam, ofensiva…): se retira y la
// media de la tienda se recalcula.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`review-del:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) {
    return new Response("Bad Request", { status: 400 });
  }

  const [row] = await db
    .select({ review: reviews, ownerId: stores.ownerId })
    .from(reviews)
    .innerJoin(stores, eq(reviews.storeId, stores.id))
    .where(eq(reviews.orderId, orderId))
    .limit(1);
  if (!row) return new Response("Not Found", { status: 404 });
  if (row.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(reviews).where(eq(reviews.id, row.review.id));
    await tx
      .update(stores)
      .set({
        ratingSum: sql`GREATEST(${stores.ratingSum} - ${row.review.rating}, 0)`,
        ratingCount: sql`GREATEST(${stores.ratingCount} - 1, 0)`,
      })
      .where(eq(stores.id, row.review.storeId));
  });

  return Response.json({ ok: true });
}
