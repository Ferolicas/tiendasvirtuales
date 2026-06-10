import Image from "next/image";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
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
    .where(eq(stores.slug, slug))
    .limit(1);
  if (!store) return { title: "Tienda no encontrada" };
  return {
    title: store.name,
    description: store.description ?? `Tienda online de ${store.name}`,
  };
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.slug, slug))
    .limit(1);
  if (!store) notFound();

  const catalog = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, store.id), eq(products.active, true)))
    .orderBy(desc(products.createdAt));

  return (
    <main className="flex-1">
      <header className="border-b bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
          {store.description ? (
            <p className="mt-2 text-muted-foreground">{store.description}</p>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {catalog.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Esta tienda todavía no tiene productos.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((product) => (
              <Card key={product.id}>
                {product.imageUrl ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-t-xl">
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
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>
                    {product.description ?? ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-lg font-semibold">
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
        Tienda creada con Vendi · vendi.olcas.app
      </footer>
    </main>
  );
}
