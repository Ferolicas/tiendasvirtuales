import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

const profileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  taxId: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
});

// Perfil de «Datos y suscripción». El email es incambiable a propósito.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`profile:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const result = profileSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set(result.data)
    .where(eq(users.id, session.user.id))
    .returning({
      name: users.name,
      phone: users.phone,
      taxId: users.taxId,
      address: users.address,
    });

  return Response.json({ profile: updated });
}

const passwordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`password:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const result = passwordSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (
    !user ||
    !(await bcrypt.compare(result.data.currentPassword, user.passwordHash))
  ) {
    return Response.json({ error: "wrong_password" }, { status: 403 });
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(result.data.newPassword, 12) })
    .where(eq(users.id, session.user.id));

  return Response.json({ ok: true });
}
