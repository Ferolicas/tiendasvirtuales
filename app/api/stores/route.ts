import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { createStoreSchema } from "@/lib/validations/store";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { slugify } from "@/lib/slug";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const own = await db
    .select()
    .from(stores)
    .where(
      and(eq(stores.ownerId, session.user.id), isNull(stores.deletedAt))
    );
  return Response.json({ stores: own });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`stores:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const result = createStoreSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const base = slugify(result.data.name);
  if (!base) {
    return Response.json({ error: "Nombre de tienda inválido" }, { status: 400 });
  }

  // Si el slug está ocupado se añade un sufijo corto aleatorio.
  let slug = base;
  const [taken] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.slug, slug))
    .limit(1);
  if (taken) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const [store] = await db
    .insert(stores)
    .values({
      ownerId: session.user.id,
      name: result.data.name,
      description: result.data.description,
      currency: result.data.currency,
      slug,
    })
    .returning();

  return Response.json({ store }, { status: 201 });
}
