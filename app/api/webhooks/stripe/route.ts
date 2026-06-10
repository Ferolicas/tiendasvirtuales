import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// Webhook de Stripe verificado por firma. Gestiona:
// - Suscripción Vendi Pro (checkout completado, cambios y bajas)
// - Pagos de pedidos en cuentas Connect (checkout con metadata.orderId)
//
// Hay DOS endpoints en el dashboard de Stripe apuntando a esta misma URL:
// uno de eventos de la cuenta plataforma (STRIPE_WEBHOOK_SECRET) y otro de
// eventos de cuentas conectadas (STRIPE_CONNECT_WEBHOOK_SECRET). Cada uno
// firma con su propio secreto, así que se verifica contra ambos.
function verifyEvent(payload: string, signature: string): Stripe.Event | null {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter((s): s is string => Boolean(s));

  for (const secret of secrets) {
    try {
      return getStripe().webhooks.constructEvent(payload, signature, secret);
    } catch {
      // probar el siguiente secreto
    }
  }
  return null;
}

export async function POST(req: Request) {
  if (
    !stripeConfigured() ||
    (!process.env.STRIPE_WEBHOOK_SECRET &&
      !process.env.STRIPE_CONNECT_WEBHOOK_SECRET)
  ) {
    return new Response("Stripe no configurado", { status: 501 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Falta la firma", { status: 400 });
  }

  const payload = await req.text();
  const event = verifyEvent(payload, signature);
  if (!event) {
    return new Response("Firma inválida", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkout = event.data.object;

      // Pago de un pedido de tienda (cuenta Connect)
      const orderId = checkout.metadata?.orderId;
      if (orderId) {
        await db
          .update(orders)
          .set({
            status: "paid",
            stripePaymentIntentId:
              typeof checkout.payment_intent === "string"
                ? checkout.payment_intent
                : (checkout.payment_intent?.id ?? null),
          })
          .where(eq(orders.id, orderId));
        break;
      }

      // Alta de suscripción Vendi Pro
      const userId = checkout.metadata?.userId;
      if (checkout.mode === "subscription" && userId) {
        await db
          .update(users)
          .set({
            plan: "pro",
            subscriptionStatus: "active",
            stripeSubscriptionId:
              typeof checkout.subscription === "string"
                ? checkout.subscription
                : (checkout.subscription?.id ?? null),
          })
          .where(eq(users.id, userId));
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const active =
        subscription.status === "active" ||
        subscription.status === "trialing";
      await db
        .update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          plan: active ? "pro" : "free",
        })
        .where(eq(users.stripeCustomerId, customerId));
      break;
    }

    default:
      break;
  }

  return Response.json({ received: true });
}
