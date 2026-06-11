import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";

const subscribeSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(300),
    auth: z.string().min(5).max(100),
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!rateLimit(`push-sub:${clientIdentifier(req)}`, 10, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const result = subscribeSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint: result.data.endpoint,
      p256dh: result.data.keys.p256dh,
      auth: result.data.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: session.user.id,
        p256dh: result.data.keys.p256dh,
        auth: result.data.keys.auth,
      },
    });

  return Response.json({ ok: true }, { status: 201 });
}

const unsubscribeSchema = z.object({ endpoint: z.url().max(1000) });

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const result = unsubscribeSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, result.data.endpoint));
  return Response.json({ ok: true });
}
