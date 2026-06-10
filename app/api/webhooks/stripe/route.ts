import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// Webhook de Stripe verificado por firma. Gestiona el ciclo de vida de la
// suscripción de la plataforma; los eventos de Connect se añadirán al
// integrar el checkout de las tiendas.
export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe no configurado", { status: 501 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Falta la firma", { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response("Firma inválida", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await db
        .update(stores)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          plan: subscription.status === "active" ? "pro" : "free",
        })
        .where(eq(stores.stripeCustomerId, customerId));
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
