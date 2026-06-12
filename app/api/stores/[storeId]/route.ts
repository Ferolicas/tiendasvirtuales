import { unlink } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { SUPPORTED_CURRENCIES, currencyForCountry } from "@/lib/currency";
import { UPLOAD_DIR } from "@/lib/storage";
import { imageUrlSchema } from "@/lib/validations/product";
import { storeHoursSchema } from "@/lib/validations/store";
import { STORE_CATEGORIES } from "@/lib/verticals";

const BANNER_PRESETS = [
  "comidas",
  "ropa",
  "tecnologia",
  "deportes",
  "finanzas",
  "belleza",
] as const;

const updateStoreSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  storeCategory: z.enum(STORE_CATEGORIES).optional(),
  description: z.string().max(500).optional(),
  shippingCents: z.number().int().min(0).max(100_000).optional(),
  logoUrl: imageUrlSchema.nullable().optional(),
  bannerUrl: imageUrlSchema.nullable().optional(),
  bannerPreset: z.enum(BANNER_PRESETS).nullable().optional(),
  schedule: z.string().max(500).nullable().optional(),
  hours: storeHoursSchema.nullable().optional(),
  timeFormat: z.enum(["24h", "12h"]).optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  country: z.string().length(2).toUpperCase().nullable().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  pickupEnabled: z.boolean().optional(),
  legalName: z.string().max(200).optional(),
  legalTaxId: z.string().max(50).optional(),
  legalAddress: z.string().max(300).optional(),
  contactEmail: z.email().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`store-update:${clientIdentifier(req)}`, 20, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId } = await params;
  const [store] = await db
    .select({
      id: stores.id,
      ownerId: stores.ownerId,
      logoUrl: stores.logoUrl,
    })
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store) return new Response("Not Found", { status: 404 });
  if (store.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const result = updateStoreSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  // Si llega país sin moneda explícita, la moneda se ajusta al país
  // (CO → COP, MX → MXN…). Así la tienda nunca queda en EUR por error.
  const data = { ...result.data };
  if (data.currency === undefined && data.country) {
    const derived = currencyForCountry(data.country);
    if (derived) data.currency = derived;
  }

  const [updated] = await db
    .update(stores)
    .set(data)
    .where(eq(stores.id, storeId))
    .returning();

  // Un logo nuevo deja huérfano al anterior en disco: se borra (solo si
  // era local y realmente cambió).
  const oldLogo = store.logoUrl;
  if (
    result.data.logoUrl !== undefined &&
    oldLogo &&
    oldLogo !== result.data.logoUrl &&
    oldLogo.startsWith("/api/files/")
  ) {
    const key = oldLogo.replace("/api/files/", "");
    const target = path.normalize(path.join(UPLOAD_DIR, key));
    if (target.startsWith(UPLOAD_DIR + path.sep)) {
      await unlink(target).catch(() => {});
    }
  }

  return Response.json({ store: updated });
}

// Eliminar tienda (soft-delete): se despublica y desaparece del panel;
// los pedidos quedan para contabilidad.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`store-delete:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId } = await params;
  const [store] = await db
    .select({ id: stores.id, ownerId: stores.ownerId })
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store) return new Response("Not Found", { status: 404 });
  if (store.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await db
    .update(stores)
    .set({ deletedAt: new Date(), customDomain: null, domainVerifiedAt: null })
    .where(eq(stores.id, storeId));

  return Response.json({ ok: true });
}
