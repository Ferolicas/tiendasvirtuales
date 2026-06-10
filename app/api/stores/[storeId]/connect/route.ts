import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

// Onboarding de Stripe Connect Express: la tienda conecta su cuenta para
// recibir los cobros de sus ventas (Vendi retiene la comisión por venta).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`connect:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }
  if (!stripeConfigured()) {
    return Response.json({ error: "stripe_not_configured" }, { status: 501 });
  }

  const { storeId } = await params;
  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store) return new Response("Not Found", { status: 404 });
  if (store.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const stripe = getStripe();

  let accountId = store.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { storeId: store.id },
    });
    accountId = account.id;
    await db
      .update(stores)
      .set({ stripeAccountId: accountId })
      .where(eq(stores.id, store.id));
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/dashboard/stores/${store.id}?connect=refresh`,
    return_url: `${appUrl}/dashboard/stores/${store.id}?connect=done`,
  });

  return Response.json({ url: link.url });
}
