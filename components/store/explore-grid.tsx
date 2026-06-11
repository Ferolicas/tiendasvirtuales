"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Star, Store as StoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { STORE_CATEGORIES } from "@/lib/verticals";

export interface ExploreStore {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  storeCategory: string | null;
  rating: string | null;
  ratingCount: number;
}

export function ExploreGrid({ stores }: { stores: ExploreStore[] }) {
  const t = useTranslations("explore");
  const tDash = useTranslations("dashboard");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((store) => {
      if (category !== "all" && store.storeCategory !== category) return false;
      if (!q) return true;
      return (
        store.name.toLowerCase().includes(q) ||
        (store.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [stores, query, category]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t("allCategories")}
          className="border-input h-9 rounded-full border bg-transparent px-3 text-sm"
        >
          <option value="all">{t("allCategories")}</option>
          {STORE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {tDash(`storeCat_${value}`)}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title={t("empty")}
          hint={t("subtitle")}
          className="mx-auto max-w-md"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((store) => (
            <div
              key={store.slug}
              className="hover-lift flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft"
            >
              <div className="relative h-24 w-full overflow-hidden">
                {store.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.bannerUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="hero-glow size-full bg-secondary" />
                )}
              </div>
              <div className="relative px-5 pb-5">
                <div className="relative -mt-7 size-14 overflow-hidden rounded-2xl border-2 border-background bg-card shadow-soft">
                  {store.logoUrl ? (
                    <Image
                      src={store.logoUrl}
                      alt={store.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-accent font-extrabold text-accent-foreground">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="mt-2 font-bold tracking-tight">{store.name}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {store.storeCategory ? (
                    <span>{tDash(`storeCat_${store.storeCategory}`)}</span>
                  ) : null}
                  {store.rating ? (
                    <span className="flex items-center gap-0.5">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {store.rating} ({store.ratingCount})
                    </span>
                  ) : null}
                </p>
                {store.description ? (
                  <p className="mt-1.5 line-clamp-2 text-sm font-light leading-relaxed text-muted-foreground">
                    {store.description}
                  </p>
                ) : null}
                <Button size="sm" asChild className="mt-3 w-full rounded-full">
                  <Link href={`/s/${store.slug}`}>{t("visit")}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
