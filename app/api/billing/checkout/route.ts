import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

// Crea la sesión de Checkout para la suscripción Vendi Pro (9,99 €/mes).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`billing:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }
  if (!stripeConfigured()) {
    return Response.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user || user.deletedAt) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (user.plan === "pro") {
    return Response.json({ error: "already_pro" }, { status: 409 });
  }

  const stripe = getStripe();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, user.id));
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const base = {
    mode: "subscription" as const,
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: 999,
          recurring: { interval: "month" as const },
          product_data: { name: "Vendi Pro" },
        },
      },
    ],
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${appUrl}/dashboard?billing=success`,
    cancel_url: `${appUrl}/dashboard?billing=cancelled`,
  };

  // Stripe Tax requiere configuración previa en el dashboard de Stripe;
  // si aún no está activa se degrada a checkout sin cálculo automático.
  let checkout;
  try {
    checkout = await stripe.checkout.sessions.create({
      ...base,
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
    });
  } catch {
    checkout = await stripe.checkout.sessions.create(base);
  }

  return Response.json({ url: checkout.url });
}
