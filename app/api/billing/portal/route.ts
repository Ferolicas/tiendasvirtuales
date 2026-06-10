import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// Portal de cliente de Stripe: gestionar/cancelar la suscripción y facturas.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!stripeConfigured()) {
    return Response.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user?.stripeCustomerId) {
    return Response.json({ error: "no_customer" }, { status: 404 });
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.APP_URL}/dashboard`,
  });

  return Response.json({ url: portal.url });
}
