import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";

class OutOfStockError extends Error {
  constructor(public productId: string) {
    super("out_of_stock");
  }
}
import { db } from "@/lib/db";
import { orders, orderItems, products, stores, users } from "@/lib/db/schema";
import { createOrderSchema } from "@/lib/validations/order";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { emitToStore } from "@/lib/realtime";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { feeFor } from "@/lib/plan";
import { verifyTurnstile } from "@/lib/turnstile";
import { verticalFor } from "@/lib/verticals";
import { sendPushToUser } from "@/lib/push";
import {
  sendOrderConfirmationEmail,
  sendOwnerNewOrderEmail,
  type OrderEmailData,
} from "@/lib/email";
import { formatPrice } from "@/lib/format";

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
  const human = await verifyTurnstile(
    (body as { turnstileToken?: unknown } | null)?.turnstileToken,
    clientIdentifier(req)
  );
  if (!human) {
    return Response.json({ error: "turnstile" }, { status: 403 });
  }

  const result = createOrderSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }
  const {
    storeId,
    customerName,
    customerEmail,
    customerPhone,
    fulfillment,
    deliveryAddress,
    paymentMethod,
    items,
  } = result.data;

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

  if (fulfillment === "pickup" && !store.pickupEnabled) {
    return Response.json({ error: "pickup_disabled" }, { status: 400 });
  }

  const productById = new Map(found.map((p) => [p.id, p]));
  const itemsTotal = items.reduce(
    (sum, i) => sum + (productById.get(i.productId)?.priceCents ?? 0) * i.quantity,
    0
  );
  // El envío solo aplica a domicilio.
  const totalCents =
    itemsTotal + (fulfillment === "delivery" ? store.shippingCents : 0);

  let order;
  try {
    order = await db.transaction(async (tx) => {
      // Stock forzado salvo «siempre disponible»: descuento atómico; si no
      // alcanza para alguna línea, el pedido entero se aborta.
      for (const item of items) {
        if (productById.get(item.productId)?.unlimitedStock) continue;
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(
            and(
              eq(products.id, item.productId),
              gte(products.stock, item.quantity)
            )
          )
          .returning({ id: products.id });
        if (updated.length === 0) {
          throw new OutOfStockError(item.productId);
        }
      }

      const [created] = await tx
        .insert(orders)
        .values({
          storeId,
          customerName,
          customerEmail,
          customerPhone,
          fulfillment,
          deliveryAddress: fulfillment === "delivery" ? deliveryAddress : null,
          paymentMethod,
          totalCents,
        })
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
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return Response.json(
        { error: "out_of_stock", productId: err.productId },
        { status: 409 }
      );
    }
    throw err;
  }

  emitToStore(storeId, "order:new", {
    id: order.id,
    orderNumber: order.orderNumber,
    storeId: order.storeId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod,
    totalCents: order.totalCents,
    status: order.status,
    createdAt: order.createdAt,
    acceptedAt: null,
    readyAt: null,
    vertical: verticalFor(store.storeCategory),
    lines: items.map((i) => ({
      name: productById.get(i.productId)?.name ?? "Producto",
      quantity: i.quantity,
    })),
  });

  // Emails de pedido (comprador + dueño) en segundo plano: no retrasan la
  // respuesta al comprador ni la tumban si Resend falla.
  const emailData: OrderEmailData = {
    storeName: store.name,
    storeLogoUrl: store.logoUrl,
    reference: `#${order.orderNumber}`,
    trackUrl: `/o/${order.id}`,
    fulfillment: order.fulfillment,
    customerName: order.customerName,
    lines: items.map((i) => {
      const product = productById.get(i.productId);
      return {
        name: product?.name ?? "Producto",
        quantity: i.quantity,
        totalFormatted: formatPrice(
          (product?.priceCents ?? 0) * i.quantity,
          store.currency
        ),
      };
    }),
    shippingFormatted:
      store.shippingCents > 0
        ? formatPrice(store.shippingCents, store.currency)
        : null,
    totalFormatted: formatPrice(totalCents, store.currency),
  };
  void (async () => {
    const [owner] = await db
      .select({ email: users.email, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, store.ownerId))
      .limit(1);
    await Promise.all([
      sendOrderConfirmationEmail(order.customerEmail, emailData),
      owner && !owner.deletedAt
        ? sendOwnerNewOrderEmail(owner.email, emailData)
        : Promise.resolve(),
      // Notificación push al dueño: suena en su móvil aunque el
      // navegador esté cerrado.
      sendPushToUser(store.ownerId, {
        title: `🛍️ Pedido #${order.orderNumber} — ${formatPrice(totalCents, store.currency)}`,
        body: `${order.customerName} · ${store.name}`,
        url: "/dashboard/orders",
        tag: order.id,
      }),
    ]);
  })().catch((err) => console.error("[orders] emails fallaron:", err));

  // Cobro con tarjeta vía Stripe Connect (cargo directo en la cuenta de la
  // tienda con comisión de plataforma según el plan del dueño).
  let checkoutUrl: string | null = null;
  if (
    paymentMethod === "card" &&
    stripeConfigured() &&
    store.stripeAccountId &&
    store.chargesEnabled
  ) {
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
      if (fulfillment === "delivery" && store.shippingCents > 0) {
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
          // Tras pagar, el cliente cae en su página de seguimiento en vivo.
          success_url: `${appUrl}/o/${order.id}`,
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
    {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
      trackUrl: `/o/${order.id}`,
      checkoutUrl,
    },
    { status: 201 }
  );
}
