import { z } from "zod";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const createUploadSchema = z.object({
  storeId: z.uuid(),
  filename: z.string().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
});

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
