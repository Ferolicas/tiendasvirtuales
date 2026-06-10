import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { consumeAuthToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIdentifier(req)}`, 5, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  const userId = await consumeAuthToken(result.data.token, "password_reset");
  if (!userId) {
    return Response.json({ error: "invalid_token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(result.data.password, 12);
  await db
    .update(users)
    .set({ passwordHash, emailVerified: new Date() })
    .where(eq(users.id, userId));

  return Response.json({ ok: true });
}
