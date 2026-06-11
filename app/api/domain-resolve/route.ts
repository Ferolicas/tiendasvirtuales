import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";

// Lo usa el proxy para enrutar dominios propios → slug de la tienda.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = url.searchParams.get("host")?.trim().toLowerCase();
  if (!host) return new Response("Bad Request", { status: 400 });

  const [store] = await db
    .select({ slug: stores.slug })
    .from(stores)
    .where(and(eq(stores.customDomain, host), isNull(stores.deletedAt)))
    .limit(1);

  if (!store) return new Response("Not Found", { status: 404 });
  return Response.json({ slug: store.slug });
}
