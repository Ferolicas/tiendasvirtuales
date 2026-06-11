import { resolve4, resolveCname } from "node:dns/promises";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores, users } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

// IP pública del VPS del holding (a donde debe apuntar el A record).
const VPS_IP = "87.106.236.248";
const PLATFORM_HOST = "vendi.olcas.app";

const domainSchema = z
  .string()
  .min(4)
  .max(253)
  .regex(/^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/)
  .refine((d) => !d.endsWith("olcas.app"), { message: "dominio reservado" });

async function ownedStore(storeId: string, userId: string) {
  const [row] = await db
    .select({ store: stores, plan: users.plan })
    .from(stores)
    .innerJoin(users, eq(stores.ownerId, users.id))
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!row || row.store.ownerId !== userId) return null;
  return row;
}

async function dnsPointsHere(domain: string): Promise<boolean> {
  try {
    const records = await resolve4(domain);
    if (records.includes(VPS_IP)) return true;
  } catch {
    // sin A record; probamos CNAME
  }
  try {
    const cnames = await resolveCname(domain);
    return cnames.some((c) => c.replace(/\.$/, "") === PLATFORM_HOST);
  } catch {
    return false;
  }
}

// PUT: asignar/cambiar el dominio propio (solo plan Pro). DELETE: quitarlo.
// POST /verify se hace vía ?action=verify para mantener una sola ruta.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`domain:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId } = await params;
  const row = await ownedStore(storeId, session.user.id);
  if (!row) return new Response("Not Found", { status: 404 });
  if (row.plan !== "pro") {
    return Response.json({ error: "plan_limit" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = domainSchema.safeParse(
    String((body as { domain?: unknown } | null)?.domain ?? "")
      .trim()
      .toLowerCase()
  );
  if (!parsed.success) {
    return Response.json({ error: "invalid_domain" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.customDomain, parsed.data))
    .limit(1);
  if (existing && existing.id !== storeId) {
    return Response.json({ error: "domain_taken" }, { status: 409 });
  }

  const verified = await dnsPointsHere(parsed.data);
  const [updated] = await db
    .update(stores)
    .set({
      customDomain: parsed.data,
      domainVerifiedAt: verified ? new Date() : null,
    })
    .where(eq(stores.id, storeId))
    .returning();

  return Response.json({
    domain: updated.customDomain,
    verified: Boolean(updated.domainVerifiedAt),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`domain-verify:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId } = await params;
  const row = await ownedStore(storeId, session.user.id);
  if (!row?.store.customDomain) {
    return new Response("Not Found", { status: 404 });
  }

  const verified = await dnsPointsHere(row.store.customDomain);
  if (verified && !row.store.domainVerifiedAt) {
    await db
      .update(stores)
      .set({ domainVerifiedAt: new Date() })
      .where(eq(stores.id, storeId));
  }
  return Response.json({ domain: row.store.customDomain, verified });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`domain-del:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId } = await params;
  const row = await ownedStore(storeId, session.user.id);
  if (!row) return new Response("Not Found", { status: 404 });

  await db
    .update(stores)
    .set({ customDomain: null, domainVerifiedAt: null })
    .where(eq(stores.id, storeId));
  return Response.json({ ok: true });
}
