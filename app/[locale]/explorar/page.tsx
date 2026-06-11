import { desc, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { VendiDot } from "@/components/shared/vendi-dot";
import { ExploreGrid } from "@/components/store/explore-grid";

export async function generateMetadata() {
  const t = await getTranslations("explore");
  return { title: t("title"), description: t("subtitle") };
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
          <ExploreGrid
            stores={list.map((store) => ({
              slug: store.slug,
              name: store.name,
              description: store.description,
              logoUrl: store.logoUrl,
              bannerUrl:
                store.bannerUrl ??
                (store.bannerPreset
                  ? `/banners/${store.bannerPreset}.svg`
                  : null),
              storeCategory: store.storeCategory,
              rating:
                store.ratingCount > 0
                  ? (store.ratingSum / store.ratingCount).toFixed(1)
                  : null,
              ratingCount: store.ratingCount,
            }))}
          />
        </div>
      </section>
    </main>
  );
}
