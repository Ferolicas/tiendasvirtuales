import { and, count, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { products, stores, users } from "@/lib/db/schema";
import { createProductSchema } from "@/lib/validations/product";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { PLAN_LIMITS } from "@/lib/plan";
import { z } from "zod";

const storeIdSchema = z.uuid();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  if (!storeIdSchema.safeParse(storeId).success) {
    return Response.json({ error: "storeId inválido" }, { status: 400 });
  }
  const list = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.active, true)));
  return Response.json({ products: list });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`products:${clientIdentifier(req)}`, 20, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId } = await params;
  if (!storeIdSchema.safeParse(storeId).success) {
    return Response.json({ error: "storeId inválido" }, { status: 400 });
  }

  const [store] = await db
    .select({ id: stores.id, ownerId: stores.ownerId })
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store) {
    return new Response("Not Found", { status: 404 });
  }
  if (store.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const result = createProductSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  // Límite de plan: free = 10 productos por tienda; pro = ilimitados.
  const [owner] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, store.ownerId))
    .limit(1);
  const [{ value: productCount }] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.storeId, storeId));
  if (
    productCount >= PLAN_LIMITS[owner?.plan ?? "free"].productsPerStore
  ) {
    return Response.json({ error: "plan_limit" }, { status: 403 });
  }

  const [product] = await db
    .insert(products)
    .values({ ...result.data, storeId })
    .returning();

  return Response.json({ product }, { status: 201 });
}
