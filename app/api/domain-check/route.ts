import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";

// Puerta de on_demand_tls de Caddy: antes de emitir un certificado para un
// hostname desconocido pregunta aquí. 200 = dominio registrado en Vendi.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const domain = url.searchParams.get("domain")?.trim().toLowerCase();
  if (!domain) return new Response("Bad Request", { status: 400 });

  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(
        eq(stores.customDomain, domain),
        isNotNull(stores.customDomain),
        isNull(stores.deletedAt)
      )
    )
    .limit(1);

  return store
    ? new Response("ok", { status: 200 })
    : new Response("unknown domain", { status: 404 });
}
