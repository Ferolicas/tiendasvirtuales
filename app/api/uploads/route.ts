import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { rateLimit, clientIdentifier } from "@/lib/rate-limit";
import { saveImage } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB de entrada
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

// Subida de imagen de producto (multipart). El servidor valida tipo y
// tamaño, la reprocesa con sharp (máx 1200px, WebP q80) — lo que se guarda
// nunca es el archivo original del cliente — y devuelve la URL pública.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!rateLimit(`uploads:${clientIdentifier(req)}`, 20, 60_000)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const storeId = form?.get("storeId");

  if (!(file instanceof File) || typeof storeId !== "string") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "invalid_file" }, { status: 400 });
  }

  const [store] = await db
    .select({ ownerId: stores.ownerId })
    .from(stores)
    .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
    .limit(1);
  if (!store || store.ownerId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  let processed: Buffer;
  try {
    processed = await sharp(input)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return Response.json({ error: "invalid_file" }, { status: 400 });
  }

  const key = `stores/${storeId}/${randomUUID()}.webp`;
  const url = await saveImage(key, processed, "image/webp");

  return Response.json({ url });
}
