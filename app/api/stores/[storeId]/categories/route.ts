import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories, stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

async function ownedStore(storeId: string, userId: string) {
  if (!z.uuid().safeParse(storeId).success) return null;
  const [store] = await db
    .select({ id: stores.id, ownerId: stores.ownerId })
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  return store && store.ownerId === userId ? store : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { storeId } = await params;
  const store = await ownedStore(storeId, session.user.id);
  if (!store) return new Response("Not Found", { status: 404 });

  const list = await db
    .select()
    .from(categories)
    .where(eq(categories.storeId, storeId))
    .orderBy(asc(categories.position), asc(categories.name));
  return Response.json({ categories: list });
}

const createCategorySchema = z.object({ name: z.string().min(2).max(60) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`categories:${clientIdentifier(req)}`, 20, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { storeId } = await params;
  const store = await ownedStore(storeId, session.user.id);
  if (!store) return new Response("Not Found", { status: 404 });

  const body = await req.json().catch(() => null);
  const result = createCategorySchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const [category] = await db
    .insert(categories)
    .values({ storeId, name: result.data.name })
    .returning();
  return Response.json({ category }, { status: 201 });
}
