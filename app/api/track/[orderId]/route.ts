import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders, reviews, stores } from "@/lib/db/schema";

// Estado público de un pedido para la barra de seguimiento del escaparate.
// El uuid (solo lo conoce el comprador) es la credencial, igual que /o/[id].
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) {
    return new Response("Bad Request", { status: 400 });
  }

  const [row] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      fulfillment: orders.fulfillment,
      customerName: orders.customerName,
      storeName: stores.name,
      storePhone: stores.phone,
    })
    .from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) return new Response("Not Found", { status: 404 });

  const [review] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.orderId, orderId))
    .limit(1);

  return Response.json({ ...row, hasReview: Boolean(review) });
}
