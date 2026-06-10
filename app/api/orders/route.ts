import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, products, stores, users } from "@/lib/db/schema";
import { createOrderSchema } from "@/lib/validations/order";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { emitToStore } from "@/lib/realtime";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { feeFor } from "@/lib/plan";

// Endpoint público: lo usan los compradores de las tiendas. El total se
// calcula SIEMPRE con los precios de la base de datos (productos + envío
// fijado por la tienda), nunca con los del cliente.
//
// Si la tienda tiene Stripe Connect activo, se devuelve una URL de Checkout
// para pagar con tarjeta (Vendi retiene su comisión por venta). Si no, el
// pedido queda "pending" y la tienda lo gestiona por su cuenta.
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
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
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

  const productById = new Map(found.map((p) => [p.id, p]));
  const itemsTotal = items.reduce(
    (sum, i) => sum + (productById.get(i.productId)?.priceCents ?? 0) * i.quantity,
    0
  );
  const totalCents = itemsTotal + store.shippingCents;

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
        unitPriceCents: productById.get(i.productId)?.priceCents ?? 0,
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

  // Cobro con tarjeta vía Stripe Connect (cargo directo en la cuenta de la
  // tienda con comisión de plataforma según el plan del dueño).
  let checkoutUrl: string | null = null;
  if (stripeConfigured() && store.stripeAccountId) {
    try {
      const [owner] = await db
        .select({ plan: users.plan })
        .from(users)
        .where(eq(users.id, store.ownerId))
        .limit(1);

      const currency = store.currency.toLowerCase();
      const lineItems = items.map((i) => {
        const product = productById.get(i.productId);
        return {
          quantity: i.quantity,
          price_data: {
            currency,
            unit_amount: product?.priceCents ?? 0,
            product_data: { name: product?.name ?? "Producto" },
          },
        };
      });
      if (store.shippingCents > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency,
            unit_amount: store.shippingCents,
            product_data: { name: "Envío · Shipping" },
          },
        });
      }

      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      const checkout = await getStripe().checkout.sessions.create(
        {
          mode: "payment",
          customer_email: customerEmail,
          line_items: lineItems,
          metadata: { orderId: order.id },
          payment_intent_data: {
            application_fee_amount: feeFor(owner?.plan ?? "free", totalCents),
            metadata: { orderId: order.id },
          },
          success_url: `${appUrl}/s/${store.slug}?paid=1`,
          cancel_url: `${appUrl}/s/${store.slug}?paid=0`,
        },
        { stripeAccount: store.stripeAccountId }
      );
      checkoutUrl = checkout.url;
    } catch (err) {
      // El pedido queda "pending"; la tienda lo gestiona manualmente.
      console.error("[orders] Stripe Checkout falló:", err);
    }
  }

  return Response.json(
    { order: { id: order.id, status: order.status }, checkoutUrl },
    { status: 201 }
  );
}
