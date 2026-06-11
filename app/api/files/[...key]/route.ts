import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/storage";

// Sirve las imágenes guardadas en disco (modo sin R2). Solo archivos .webp
// generados por el propio servidor; ruta normalizada contra path traversal.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const relative = key.join("/");

  const target = path.normalize(path.join(UPLOAD_DIR, relative));
  if (
    !target.startsWith(UPLOAD_DIR + path.sep) ||
    !target.endsWith(".webp") ||
    !existsSync(target)
  ) {
    return new Response("Not Found", { status: 404 });
  }

  const size = statSync(target).size;
  const stream = Readable.toWeb(
    createReadStream(target)
  ) as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
