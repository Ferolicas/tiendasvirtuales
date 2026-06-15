import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores, type Store } from "@/lib/db/schema";
import { mpRefresh } from "@/lib/mercadopago";

// Devuelve un access_token válido de la tienda para cobrar en su nombre. Si el
// token está a punto de caducar (margen de 7 días sobre los 180), lo refresca
// con el refresh_token y persiste el nuevo. El access_token NUNCA sale al
// cliente: solo se usa en el servidor.
const REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000;

export async function mpValidAccessToken(store: Store): Promise<string> {
  if (!store.mpAccessToken || !store.mpRefreshToken) {
    throw new Error("La tienda no tiene Mercado Pago conectado");
  }

  const expiresAt = store.mpTokenExpiresAt?.getTime() ?? 0;
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return store.mpAccessToken;
  }

  const tokens = await mpRefresh(store.mpRefreshToken);
  await db
    .update(stores)
    .set({
      mpAccessToken: tokens.access_token,
      mpRefreshToken: tokens.refresh_token,
      mpPublicKey: tokens.public_key,
      mpTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    })
    .where(eq(stores.id, store.id));
  return tokens.access_token;
}
