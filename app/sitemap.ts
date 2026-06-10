import type { MetadataRoute } from "next";
import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";

// El sitemap consulta la DB (tiendas activas): debe generarse en cada
// petición, nunca en build.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "https://vendi.olcas.app";

  const staticPaths = [
    "",
    "/login",
    "/register",
    "/legal",
    "/privacy",
    "/cookies",
    "/terms",
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.flatMap((path) => [
    {
      url: `${base}${path || "/"}`,
      changeFrequency: "weekly",
      priority: path === "" ? 1 : 0.5,
      alternates: {
        languages: {
          es: `${base}${path || "/"}`,
          en: `${base}/en${path}`,
        },
      },
    },
    {
      url: `${base}/en${path}`,
      changeFrequency: "weekly",
      priority: path === "" ? 0.9 : 0.4,
    },
  ]);

  const activeStores = await db
    .select({ slug: stores.slug, createdAt: stores.createdAt })
    .from(stores)
    .where(isNull(stores.deletedAt));

  for (const store of activeStores) {
    entries.push({
      url: `${base}/s/${store.slug}`,
      lastModified: store.createdAt,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return entries;
}
