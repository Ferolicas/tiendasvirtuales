import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { products, stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { emitToCatalog } from "@/lib/realtime";
import { imageUrlSchema } from "@/lib/validations/product";

const updateProductSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  priceCents: z.number().int().min(1).max(100_000_000).optional(),
  compareAtCents: z
    .number()
    .int()
    .min(1)
    .max(100_000_000)
    .nullable()
    .optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  unlimitedStock: z.boolean().optional(),
  recommended: z.boolean().optional(),
  active: z.boolean().optional(),
  imageUrl: imageUrlSchema.nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
});

async function authorize(storeId: string, productId: string, userId: string) {
  if (
    !z.uuid().safeParse(storeId).success ||
    !z.uuid().safeParse(productId).success
  ) {
    return { error: new Response("Bad Request", { status: 400 }) };
  }
  const [store] = await db
    .select({ ownerId: stores.ownerId })
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store || store.ownerId !== userId) {
    return { error: new Response("Not Found", { status: 404 }) };
  }
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .limit(1);
  if (!product) {
    return { error: new Response("Not Found", { status: 404 }) };
  }
  return { error: null };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`product-update:${clientIdentifier(req)}`, 30, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId, productId } = await params;
  const { error } = await authorize(storeId, productId, session.user.id);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const result = updateProductSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(products)
    .set(result.data)
    .where(eq(products.id, productId))
    .returning();

  emitToCatalog(storeId, "product:update", { product: updated });

  return Response.json({ product: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`product-delete:${clientIdentifier(req)}`, 20, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId, productId } = await params;
  const { error } = await authorize(storeId, productId, session.user.id);
  if (error) return error;

  try {
    await db.delete(products).where(eq(products.id, productId));
  } catch (err) {
    // FK restrict: el producto aparece en pedidos; se conserva el histórico.
    const pgCode = (err as { cause?: { code?: string } })?.cause?.code;
    if (pgCode === "23503") {
      return Response.json({ error: "has_orders" }, { status: 409 });
    }
    throw err;
  }

  emitToCatalog(storeId, "product:delete", { id: productId });

  return Response.json({ ok: true });
}
