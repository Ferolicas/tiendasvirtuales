import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, email, password } = result.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return Response.json(
      { error: "Ya existe una cuenta con ese email" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({ id: users.id, email: users.email, name: users.name });

  return Response.json({ user }, { status: 201 });
}
