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
  // Checkout EMBEBIDO: se renderiza dentro de un drawer de Vendi (nada de
  // redirigir a una página de Stripe); al completar vuelve al panel.
  const base = {
    ui_mode: "embedded_page" as const,
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
    return_url: `${appUrl}/dashboard?billing=success`,
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

  return Response.json({ clientSecret: checkout.client_secret });
}
