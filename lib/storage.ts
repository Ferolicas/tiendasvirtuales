import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 vía API compatible con S3. La subida se hace con URL
// presignada generada en servidor: el cliente nunca ve las credenciales.
let _client: S3Client | null = null;

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  );
}

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return _client;
}

export async function createUploadUrl(
  key: string,
  contentType: string,
  size: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 600 });
}

export function publicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

// ── Almacenamiento local (fallback sin R2) ────────────────────────────────
// Las imágenes viven en ./uploads del VPS y se sirven por /api/files/<key>.
// Cuando se configuren las claves R2, saveImage cambia de destino sin tocar
// nada más (las URLs guardadas en DB son absolutas en cada caso).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function saveImage(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (r2Configured()) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return publicUrl(key);
  }

  const target = path.join(UPLOAD_DIR, key);
  // El key lo genera el servidor (uuid + extensión fija): sin path traversal.
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return `/api/files/${key}`;
}
