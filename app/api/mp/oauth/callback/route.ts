import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { mpExchangeCode } from "@/lib/mercadopago";
import { verifyState } from "@/lib/mp-state";

// Callback del OAuth de Mercado Pago. La tienda vuelve aquí tras autorizar;
// intercambiamos el `code` por sus tokens y los guardamos para poder cobrar en
// su nombre. El `state` (firmado) nos dice qué tienda es y evita CSRF.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const appUrl = process.env.APP_URL ?? url.origin;
  const back = (q: string) =>
    Response.redirect(`${appUrl}/dashboard/stores?${q}`, 303);

  if (url.searchParams.get("error")) return back("mp=error");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return back("mp=error");

  const storeId = verifyState(state);
  if (!storeId) return back("mp=error");

  // Defensa extra sobre el state: la tienda debe estar logueada y ser su dueña.
  const session = await auth();
  if (!session?.user?.id) return Response.redirect(`${appUrl}/login`, 303);

  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store || store.ownerId !== session.user.id) return back("mp=error");

  try {
    const tokens = await mpExchangeCode(code);
    await db
      .update(stores)
      .set({
        mpUserId: String(tokens.user_id),
        mpAccessToken: tokens.access_token,
        mpRefreshToken: tokens.refresh_token,
        mpPublicKey: tokens.public_key,
        mpTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        mpConnected: true,
      })
      .where(eq(stores.id, store.id));
  } catch (err) {
    console.error("[mp] OAuth callback falló:", err);
    return back("mp=error");
  }

  return back("mp=done");
}
