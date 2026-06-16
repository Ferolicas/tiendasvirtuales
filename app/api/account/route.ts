import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, products, stores, users } from "@/lib/db/schema";

const profileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
});

// Actualiza el perfil (nombre, teléfono, dirección). Lo usan tanto el cliente
// (su «Mi perfil») como el vendedor. La dirección del cliente es su envío
// predeterminado.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await db.update(users).set(parsed.data).where(eq(users.id, session.user.id));
  return Response.json({ ok: true });
}

// Borrado de cuenta autoservicio (RGPD): los datos personales se anonimizan
// y las tiendas se dan de baja; los pedidos se conservan anonimizados por
// obligación fiscal (la facturación real vive en Stripe).
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  await db.transaction(async (tx) => {
    const own = await tx
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.ownerId, userId));
    const storeIds = own.map((s) => s.id);

    if (storeIds.length > 0) {
      await tx
        .update(orders)
        .set({ customerName: "Anónimo", customerEmail: "deleted@vendi.app" })
        .where(inArray(orders.storeId, storeIds));
      await tx
        .update(products)
        .set({ active: false })
        .where(inArray(products.storeId, storeIds));
      await tx
        .update(stores)
        .set({ deletedAt: new Date() })
        .where(inArray(stores.id, storeIds));
    }

    await tx
      .update(users)
      .set({
        name: "Cuenta eliminada",
        email: `deleted-${userId}@deleted.vendi.app`,
        passwordHash: randomBytes(32).toString("hex"),
        deletedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });

  return Response.json({ ok: true });
}
