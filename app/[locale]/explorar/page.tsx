import { desc, inArray, isNull, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { orders, products, reviews, stores } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { VendiDot } from "@/components/shared/vendi-dot";
import { ExploreGrid } from "@/components/store/explore-grid";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("explore");
  return { title: t("title"), description: t("subtitle") };
}

// Redondeo amable para estimaciones: al múltiplo de 5 más cercano, mínimo 5.
function roundEstimate(minutes: number | null): number | null {
  if (minutes === null || !Number.isFinite(minutes)) return null;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

// Festivos nacionales de hoy por país (Nager.Date, gratuita y sin clave).
// Cache de 24 h; si la API falla, simplemente no hay aviso.
async function holidayToday(country: string): Promise<string | null> {
  try {
    const year = new Date().getFullYear();
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
      { next: { revalidate: 86_400 } }
    );
    if (!res.ok) return null;
    const holidays: Array<{ date: string; localName: string }> =
      await res.json();
    const today = new Date().toISOString().slice(0, 10);
    return holidays.find((h) => h.date === today)?.localName ?? null;
  } catch {
    return null;
  }
}

// Directorio público de tiendas: la cara «marketplace» de Vendi (y la
// pantalla del comprador en la futura app).
export default async function ExplorePage() {
  const t = await getTranslations("explore");
  const tc = await getTranslations("common");

  const list = await db
    .select()
    .from(stores)
    .where(isNull(stores.deletedAt))
    .orderBy(desc(stores.ratingSum), desc(stores.createdAt))
    .limit(100);

  const ids = list.map((s) => s.id);

  // Promedios reales por tienda: minutos de cada fase (espera → preparación
  // → reparto) sobre pedidos completados, y ticket medio de pedidos cobrados.
  const orderStats = ids.length
    ? await db
        .select({
          storeId: orders.storeId,
          waitMin: sql<
            string | null
          >`avg(extract(epoch from (${orders.acceptedAt} - ${orders.createdAt})) / 60)`,
          prepMin: sql<
            string | null
          >`avg(extract(epoch from (${orders.readyAt} - ${orders.acceptedAt})) / 60)`,
          deliverMin: sql<
            string | null
          >`avg(extract(epoch from (${orders.deliveredAt} - ${orders.readyAt})) / 60) filter (where ${orders.fulfillment} = 'delivery')`,
          avgTicket: sql<
            string | null
          >`avg(${orders.totalCents}) filter (where ${orders.status} in ('paid','preparing','ready','delivered','shipped'))`,
        })
        .from(orders)
        .where(inArray(orders.storeId, ids))
        .groupBy(orders.storeId)
    : [];
  const statsByStore = new Map(orderStats.map((s) => [s.storeId, s]));

  // Fallback de ticket medio para tiendas aún sin ventas: media de los
  // precios de sus productos activos.
  const priceStats = ids.length
    ? await db
        .select({
          storeId: products.storeId,
          avgPrice: sql<string | null>`avg(${products.priceCents})`,
        })
        .from(products)
        .where(inArray(products.storeId, ids))
        .groupBy(products.storeId)
    : [];
  const priceByStore = new Map(priceStats.map((s) => [s.storeId, s.avgPrice]));

  // Últimas reseñas (modal de la tarjeta); se agrupan por tienda en memoria.
  const latestReviews = ids.length
    ? await db
        .select()
        .from(reviews)
        .where(inArray(reviews.storeId, ids))
        .orderBy(desc(reviews.createdAt))
        .limit(300)
    : [];
  const reviewsByStore = new Map<string, typeof latestReviews>();
  for (const review of latestReviews) {
    const bucket = reviewsByStore.get(review.storeId) ?? [];
    if (bucket.length < 12) bucket.push(review);
    reviewsByStore.set(review.storeId, bucket);
  }

  // Aviso de festivo: una consulta por país distinto presente en la lista.
  const countries = [
    ...new Set(list.map((s) => s.country).filter((c): c is string => !!c)),
  ];
  const holidayEntries = await Promise.all(
    countries.map(async (c) => [c, await holidayToday(c)] as const)
  );
  const holidayByCountry = new Map(holidayEntries);

  const cards = list.map((store) => {
    const stats = statsByStore.get(store.id);
    const wait = stats?.waitMin ? Number(stats.waitMin) : null;
    const prep = stats?.prepMin ? Number(stats.prepMin) : null;
    const deliver = stats?.deliverMin ? Number(stats.deliverMin) : null;
    const avgPrice = priceByStore.get(store.id);
    const ticket = stats?.avgTicket
      ? Number(stats.avgTicket)
      : avgPrice
        ? Number(avgPrice)
        : null;

    return {
      slug: store.slug,
      name: store.name,
      description: store.description,
      logoUrl: store.logoUrl,
      bannerUrl:
        store.bannerUrl ??
        (store.bannerPreset ? `/banners/${store.bannerPreset}.svg` : null),
      storeCategory: store.storeCategory,
      schedule: store.schedule,
      hours: store.hours,
      holidayName: store.country
        ? (holidayByCountry.get(store.country) ?? null)
        : null,
      phone: store.phone,
      address: store.address,
      city: store.city,
      latitude: store.latitude,
      longitude: store.longitude,
      pickupEnabled: store.pickupEnabled,
      currency: store.currency,
      ratingAvg:
        store.ratingCount > 0 ? store.ratingSum / store.ratingCount : null,
      ratingCount: store.ratingCount,
      reviews: (reviewsByStore.get(store.id) ?? []).map((r) => ({
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerName,
        createdAt: r.createdAt.toISOString(),
      })),
      // Domicilio = espera + preparación + reparto; recogida = espera +
      // preparación. Solo se muestran cuando hay historial suficiente.
      deliveryEstMin:
        wait !== null && prep !== null
          ? roundEstimate(wait + prep + (deliver ?? 0))
          : null,
      pickupEstMin:
        wait !== null && prep !== null ? roundEstimate(wait + prep) : null,
      avgTicketCents: ticket !== null ? Math.round(ticket) : null,
    };
  });

  return (
    <main className="flex-1">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            vendi<span className="text-brand">.</span>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <LocaleSwitcher />
            <ThemeToggle />
            <Button size="sm" asChild className="rounded-full px-4">
              <Link href="/register">{tc("register")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight sm:text-4xl">
          <VendiDot className="size-2.5" />
          {t("title")}
        </h1>
        <p className="mt-2 font-light text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="mt-8">
          <ExploreGrid stores={cards} />
        </div>
      </section>
    </main>
  );
}
