import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";

const querySchema = z.object({
  before: z.iso.datetime().optional(),
});

// Paginación por cursor (createdAt) de los pedidos de una tienda propia.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { storeId } = await params;
  if (!z.uuid().safeParse(storeId).success) {
    return new Response("Bad Request", { status: 400 });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    before: url.searchParams.get("before") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [store] = await db
    .select({ ownerId: stores.ownerId })
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store || store.ownerId !== session.user.id) {
    return new Response("Not Found", { status: 404 });
  }

  const conditions = [eq(orders.storeId, storeId)];
  if (parsed.data.before) {
    conditions.push(lt(orders.createdAt, new Date(parsed.data.before)));
  }

  const page = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(20);

  return Response.json({
    orders: page,
    hasMore: page.length === 20,
  });
}
