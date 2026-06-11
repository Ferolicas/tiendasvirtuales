import { unlink } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { UPLOAD_DIR } from "@/lib/storage";
import { imageUrlSchema } from "@/lib/validations/product";

const updateStoreSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  shippingCents: z.number().int().min(0).max(100_000).optional(),
  logoUrl: imageUrlSchema.nullable().optional(),
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

  const [updated] = await db
    .update(stores)
    .set(result.data)
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
