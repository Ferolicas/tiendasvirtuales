import Image from "next/image";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { products, stores } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BuyForm } from "@/components/shared/buy-form";
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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {store.name}
          </h1>
          {store.description ? (
            <p className="mt-3 text-muted-foreground">{store.description}</p>
          ) : null}
          {store.shippingCents > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("shipping")}: {formatPrice(store.shippingCents, store.currency)}
            </p>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        {paid === "1" ? (
          <p className="animate-fade-in mx-auto mb-8 max-w-md rounded-2xl bg-green-50 p-4 text-center text-sm font-medium text-green-700">
            {t("paidSuccess")}
          </p>
        ) : null}
        {paid === "0" ? (
          <p className="animate-fade-in mx-auto mb-8 max-w-md rounded-2xl bg-secondary p-4 text-center text-sm text-muted-foreground">
            {t("paidCancelled")}
          </p>
        ) : null}
        {catalog.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("noProducts")}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((product) => (
              <Card
                key={product.id}
                className="hover-lift overflow-hidden rounded-3xl shadow-soft"
              >
                {product.imageUrl ? (
                  <div className="relative aspect-square w-full overflow-hidden">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle className="tracking-tight">
                    {product.name}
                  </CardTitle>
                  <CardDescription>{product.description ?? ""}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-lg font-bold tracking-tight">
                    {formatPrice(product.priceCents, store.currency)}
                  </p>
                  <BuyForm storeId={store.id} productId={product.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {t("madeWith")} · vendi.olcas.app
      </footer>
    </main>
  );
}
