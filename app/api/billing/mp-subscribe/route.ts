import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  mpCreatePreference,
  mpPlatformConfigured,
  mpPlatformToken,
} from "@/lib/mercadopago";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

// Suscripción Vendi Pro cobrada por Mercado Pago en la cuenta de Vendi (no es
// split). Pago manual mensual; al aprobarse, el webhook marca Pro hasta la
// fecha de vencimiento. Devuelve la URL de Checkout Pro para redirigir.
const PRO_PRICE_COP = 50000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`billing:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }
  if (!mpPlatformConfigured()) {
    return Response.json({ error: "mp_not_configured" }, { status: 501 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user || user.deletedAt) {
    return new Response("Unauthorized", { status: 401 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  try {
    const pref = await mpCreatePreference(mpPlatformToken(), {
      items: [
        {
          id: "vendi-pro",
          title: "Vendi Pro — 1 mes",
          quantity: 1,
          unit_price: PRO_PRICE_COP,
          currency_id: "COP",
        },
      ],
      payer: { name: user.name, email: user.email },
      // El prefijo "pro:" distingue este pago (suscripción) de los pedidos.
      external_reference: `pro:${user.id}`,
      metadata: { user_id: user.id, kind: "pro" },
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${appUrl}/dashboard?billing=success`,
        pending: `${appUrl}/dashboard?billing=pending`,
        failure: `${appUrl}/dashboard?billing=cancelled`,
      },
      auto_return: "approved",
    });
    return Response.json({ url: pref.init_point });
  } catch (err) {
    console.error("[billing] preferencia Pro de Mercado Pago falló:", err);
    return Response.json({ error: "mp_error" }, { status: 502 });
  }
}
