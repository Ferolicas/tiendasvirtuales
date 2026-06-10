import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { consumeAuthToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const appUrl = process.env.APP_URL ?? url.origin;

  if (!token) {
    return Response.redirect(`${appUrl}/login?verified=0`, 302);
  }

  const userId = await consumeAuthToken(token, "email_verify");
  if (!userId) {
    return Response.redirect(`${appUrl}/login?verified=0`, 302);
  }

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, userId));

  return Response.redirect(`${appUrl}/login?verified=1`, 302);
}
