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
// split). Al aprobarse, el webhook marca Pro hasta la fecha de vencimiento.
// Planes con descuento por pago adelantado.
const PLANS = {
  "1": { months: 1, price: 50000, label: "1 mes" },
  "3": { months: 3, price: 135000, label: "3 meses (-10%)" },
  "12": { months: 12, price: 480000, label: "1 año (-20%)" },
} as const;
type PeriodId = keyof typeof PLANS;

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

  const body = (await req.json().catch(() => ({}))) as { period?: string };
  const period: PeriodId =
    body.period === "3" ? "3" : body.period === "12" ? "12" : "1";
  const plan = PLANS[period];

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  try {
    const pref = await mpCreatePreference(mpPlatformToken(), {
      items: [
        {
          id: "vendi-pro",
          title: `Vendi Pro — ${plan.label}`,
          quantity: 1,
          unit_price: plan.price,
          currency_id: "COP",
        },
      ],
      payer: { name: user.name, email: user.email },
      // "pro:<userId>:<meses>": distingue la suscripción y cuántos meses dar.
      external_reference: `pro:${user.id}:${plan.months}`,
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
