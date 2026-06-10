import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { authTokens } from "@/lib/db/schema";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(
  userId: string,
  type: "email_verify" | "password_reset",
  ttlMs: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  // Un token activo por tipo y usuario: los anteriores se invalidan.
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type)));
  await db.insert(authTokens).values({
    userId,
    tokenHash: hashToken(token),
    type,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

export async function consumeAuthToken(
  token: string,
  type: "email_verify" | "password_reset"
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.type, type),
        gt(authTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!row) return null;
  await db.delete(authTokens).where(eq(authTokens.id, row.id));
  return row.userId;
}
