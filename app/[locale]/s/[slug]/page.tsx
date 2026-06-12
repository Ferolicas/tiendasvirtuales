import Image from "next/image";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Clock, Globe, MapPin, Phone, Star } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import {
  categories,
  products,
  reviews,
  stores,
  users,
} from "@/lib/db/schema";
import { ReviewsDialog } from "@/components/store/reviews-dialog";
import { ShareButton } from "@/components/store/share-button";
import { Storefront } from "@/components/store/storefront";

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
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { locale, slug } = await params;
  const { paid } = await searchParams;
  const t = await getTranslations("store");

  const [row] = await db
    .select({ store: stores, ownerPlan: users.plan })
    .from(stores)
    .innerJoin(users, eq(stores.ownerId, users.id))
    .where(and(eq(stores.slug, slug), isNull(stores.deletedAt)))
    .limit(1);
  if (!row) notFound();
  const store = row.store;
  const isPro = row.ownerPlan === "pro";

  const [catalog, categoryList, reviewList] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.storeId, store.id), eq(products.active, true)))
      .orderBy(desc(products.createdAt)),
    db
      .select()
      .from(categories)
      .where(eq(categories.storeId, store.id))
      .orderBy(asc(categories.position), asc(categories.name)),
    db
      .select()
      .from(reviews)
      .where(eq(reviews.storeId, store.id))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
  ]);

  const banner =
    store.bannerUrl ??
    (store.bannerPreset ? `/banners/${store.bannerPreset}.svg` : null);
  const rating =
    store.ratingCount > 0
      ? (store.ratingSum / store.ratingCount).toFixed(1)
      : null;

  return (
    <main className="flex-1">
      {/* Cabecera estilo Uber Eats: banner + logo a caballo */}
      <header>
        <div className="relative h-44 w-full overflow-hidden sm:h-64">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="hero-glow size-full bg-secondary" />
          )}
          <ShareButton
            title={store.name}
            text={store.description ?? store.name}
          />
        </div>

        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="relative -mt-12 size-24 overflow-hidden rounded-3xl border-4 border-background bg-card shadow-soft sm:-mt-14 sm:size-28">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-accent text-3xl font-extrabold text-accent-foreground">
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="grid gap-1.5 pb-6 pt-4">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {store.name}
            </h1>
            <ReviewsDialog
              rating={rating}
              count={store.ratingCount}
              reviews={reviewList.map((review) => ({
                rating: review.rating,
                comment: review.comment,
                customerName: review.customerName,
                createdAt: review.createdAt.toISOString(),
              }))}
            />
            {store.schedule ? (
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <Clock className="mt-0.5 size-4 shrink-0" />
                <span className="whitespace-pre-line">{store.schedule}</span>
              </p>
            ) : null}
            {store.description ? (
              <p className="max-w-xl text-sm font-light leading-relaxed text-muted-foreground">
                {store.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {store.phone ? (
                <a
                  href={`tel:${store.phone}`}
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <Phone className="size-4" />
                  {store.phone}
                </a>
              ) : null}
              {store.address ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {store.address}
                </span>
              ) : null}
              {store.city || store.country ? (
                <span className="flex items-center gap-1.5">
                  <Globe className="size-4" />
                  {[
                    store.city,
                    store.country
                      ? new Intl.DisplayNames([locale], {
                          type: "region",
                        }).of(store.country)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {paid === "0" ? (
        <p className="animate-fade-in mx-auto mt-6 max-w-md rounded-2xl bg-secondary p-4 text-center text-sm text-muted-foreground">
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
          pickupEnabled: store.pickupEnabled,
        }}
        categories={categoryList.map((c) => ({ id: c.id, name: c.name }))}
        products={catalog.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          imageUrl: product.imageUrl,
          stock: product.stock,
          unlimitedStock: product.unlimitedStock,
          recommended: product.recommended,
          salesCount: product.salesCount,
          categoryId: product.categoryId,
        }))}
      />

      <footer className="grid gap-2 border-t py-6 text-center text-xs text-muted-foreground">
        <Link href={`/s/${slug}/legal`} className="hover:text-foreground">
          {t("legalLink")}
        </Link>
        {/* Plan Pro: sin marca Vendi. Free: marca con enlace clicable. */}
        {!isPro ? (
          <p>
            <a
              href="https://vendi.olcas.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("madeWith")} · vendi.olcas.app
            </a>
          </p>
        ) : null}
      </footer>
    </main>
  );
}
