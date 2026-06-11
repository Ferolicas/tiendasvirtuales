import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { products, stores } from "@/lib/db/schema";
import { Storefront } from "@/components/store/storefront";
import { formatPrice } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [store] = await db
    .select({ name: stores.name, description: stores.description })
    .from(stores)
    .where(and(eq(stores.slug, slug), isNull(stores.deletedAt)))
    .limit(1);
  if (!store) return { title: "404" };
  return {
    title: store.name,
    description: store.description ?? `${store.name} · Vendi`,
  };
}

export default async function PublicStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { slug } = await params;
  const { paid } = await searchParams;
  const t = await getTranslations("store");

  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.slug, slug), isNull(stores.deletedAt)))
    .limit(1);
  if (!store) notFound();

  const catalog = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, store.id), eq(products.active, true)))
    .orderBy(desc(products.createdAt));

  return (
    <main className="flex-1">
      <header className="border-b bg-secondary/40">
        <div className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {store.name}
          </h1>
          {store.description ? (
            <p className="mt-3 font-light text-muted-foreground">
              {store.description}
            </p>
          ) : null}
          {store.shippingCents > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("shipping")}:{" "}
              {formatPrice(store.shippingCents, store.currency)}
            </p>
          ) : null}
        </div>
      </header>

      {paid === "1" ? (
        <p className="animate-fade-in mx-auto mt-8 max-w-md rounded-2xl bg-green-50 p-4 text-center text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
          {t("paidSuccess")}
        </p>
      ) : null}
      {paid === "0" ? (
        <p className="animate-fade-in mx-auto mt-8 max-w-md rounded-2xl bg-secondary p-4 text-center text-sm text-muted-foreground">
          {t("paidCancelled")}
        </p>
      ) : null}

      <Storefront
        store={{
          id: store.id,
          name: store.name,
          description: store.description,
          currency: store.currency,
          shippingCents: store.shippingCents,
        }}
        products={catalog.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          imageUrl: product.imageUrl,
          stock: product.stock,
        }))}
      />

      <footer className="grid gap-2 border-t py-6 text-center text-xs text-muted-foreground">
        <Link href={`/s/${slug}/legal`} className="hover:text-foreground">
          {t("legalLink")}
        </Link>
        <p>{t("madeWith")} · vendi.olcas.app</p>
      </footer>
    </main>
  );
}
