import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { createUploadSchema } from "@/lib/validations/upload";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { r2Configured, createUploadUrl, publicUrl } from "@/lib/storage";

// Devuelve una URL presignada de R2 para subir una imagen. El tipo y el
// tamaño se validan en servidor; el cliente nunca recibe credenciales.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`uploads:${clientIdentifier(req)}`, 20, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }
  if (!r2Configured()) {
    return Response.json(
      { error: "Almacenamiento R2 no configurado todavía" },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  const result = createUploadSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }
  const { storeId, contentType, size, filename } = result.data;

  const [store] = await db
    .select({ ownerId: stores.ownerId })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store || store.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const extension = filename.includes(".")
    ? filename.split(".").pop()
    : "bin";
  const key = `stores/${storeId}/${randomUUID()}.${extension}`;
  const uploadUrl = await createUploadUrl(key, contentType, size);

  return Response.json({ uploadUrl, key, publicUrl: publicUrl(key) });
}
