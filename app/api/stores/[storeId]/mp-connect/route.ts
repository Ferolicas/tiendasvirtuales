import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { mpConfigured, mpAuthorizationUrl } from "@/lib/mercadopago";
import { signState } from "@/lib/mp-state";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

// Onboarding de Mercado Pago (equivalente a Stripe Connect, pero con PSE): la
// tienda autoriza por OAuth a Vendi a cobrar en su nombre, y Vendi retiene su
// comisión por venta (marketplace_fee). Aquí solo arrancamos el OAuth; los
// tokens se guardan en el callback.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`mp-connect:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }
  if (!mpConfigured()) {
    return Response.json({ error: "mp_not_configured" }, { status: 501 });
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

  // `state` firmado con el storeId: nos dice qué tienda vuelve y evita CSRF.
  const url = mpAuthorizationUrl(signState(store.id));
  return Response.json({ url });
}

// Estado de la conexión: lo consulta el botón al volver del onboarding.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!mpConfigured()) {
    return Response.json({ connected: false, pending: false });
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

  return Response.json({ connected: store.mpConnected, pending: false });
}
