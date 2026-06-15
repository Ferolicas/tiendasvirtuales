import { and, eq } from "drizzle-orm";
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { db } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { mpGetPayment } from "@/lib/mercadopago";
import { mpValidAccessToken } from "@/lib/mp-tokens";
import { emitToStore } from "@/lib/realtime";

// Webhook de Mercado Pago (avisos de pago de los pedidos de las tiendas).
// Verificado por firma `x-signature` con MP_WEBHOOK_SECRET. Al aprobarse un
// pago, marca el pedido como "paid" y avisa al panel del dueño en tiempo real.
//
// El pago vive en la cuenta de la TIENDA (modelo marketplace), así que para
// consultarlo usamos su access_token: identificamos la tienda por el `user_id`
// del aviso y leemos el pedido por `external_reference` (= order.id).

// Algunas comprobaciones de conectividad de MP usan GET; respondemos 200.
export function GET() {
  return Response.json({ ok: true });
}

export async function POST(req: Request) {
  if (!process.env.MP_WEBHOOK_SECRET) {
    return new Response("Mercado Pago no configurado", { status: 501 });
  }

  const url = new URL(req.url);

  // 1) Verificar que el aviso viene de verdad de Mercado Pago.
  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: url.searchParams.get("data.id"),
      secret: process.env.MP_WEBHOOK_SECRET,
      toleranceSeconds: 300,
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      return new Response("Firma inválida", { status: 401 });
    }
    throw err;
  }

  const body = (await req.json().catch(() => null)) as {
    type?: string;
    data?: { id?: string };
    user_id?: number | string;
  } | null;

  // Solo nos interesan los pagos (ignoramos merchant_order, etc.).
  const type = body?.type ?? url.searchParams.get("type");
  if (type !== "payment") {
    return Response.json({ received: true });
  }

  const paymentId = body?.data?.id ?? url.searchParams.get("data.id");
  const userId = body?.user_id != null ? String(body.user_id) : null;
  if (!paymentId || !userId) {
    return Response.json({ received: true });
  }

  // Tienda dueña del cobro: su token nos deja consultar el pago.
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.mpUserId, userId))
    .limit(1);
  if (!store?.mpAccessToken) {
    return Response.json({ received: true });
  }

  try {
    const token = await mpValidAccessToken(store);
    const payment = await mpGetPayment(token, String(paymentId));
    const orderId = payment.external_reference;

    if (payment.status === "approved" && orderId) {
      // Solo pending → paid (idempotente: ignora avisos duplicados y no pisa
      // pedidos que ya avanzaron de estado).
      const [updated] = await db
        .update(orders)
        .set({ status: "paid", mpPaymentId: String(payment.id) })
        .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
        .returning();
      if (updated) {
        emitToStore(updated.storeId, "order:update", {
          id: updated.id,
          status: updated.status,
        });
      }
    }
  } catch (err) {
    // 200 igualmente: evitamos que MP reintente en bucle por un fallo nuestro;
    // el pago puede reconciliarse después si fue transitorio.
    console.error("[mp] webhook pago falló:", err);
  }

  return Response.json({ received: true });
}
