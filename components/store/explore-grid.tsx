"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Bike,
  CalendarDays,
  Clock,
  LocateFixed,
  Loader2,
  MapPin,
  Phone,
  Receipt,
  Search,
  ShoppingBag,
  Store as StoreIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ReviewsDialog,
  type PublicReview,
} from "@/components/store/reviews-dialog";
import { STORE_CATEGORIES } from "@/lib/verticals";
import {
  distanceKm,
  isOpenFromHours,
  isOpenNow,
  type StoreHoursRow,
} from "@/lib/schedule";
import { formatPrice } from "@/lib/format";

export interface ExploreStore {
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  storeCategory: string | null;
  schedule: string | null;
  hours: StoreHoursRow[] | null;
  holidayName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  pickupEnabled: boolean;
  currency: string;
  ratingAvg: number | null;
  ratingCount: number;
  reviews: PublicReview[];
  deliveryEstMin: number | null;
  pickupEstMin: number | null;
  avgTicketCents: number | null;
}

type Coords = { lat: number; lng: number };

export function ExploreGrid({ stores }: { stores: ExploreStore[] }) {
  const t = useTranslations("explore");
  const tDash = useTranslations("dashboard");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const store of stores) {
      if (store.city?.trim()) set.add(store.city.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [stores]);

  function locate() {
    if (coords) {
      setCoords(null);
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error(t("geoFailed"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error(t("geoFailed"));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const enriched = stores.map((store) => ({
      store,
      // Horario estructurado si existe; texto libre como respaldo legado.
      open: store.hours?.length
        ? isOpenFromHours(store.hours)
        : isOpenNow(store.schedule),
      km:
        coords && store.latitude !== null && store.longitude !== null
          ? distanceKm(coords.lat, coords.lng, store.latitude, store.longitude)
          : null,
    }));

    const filtered = enriched.filter(({ store, open }) => {
      if (category !== "all" && store.storeCategory !== category) return false;
      if (city !== "all" && store.city?.trim() !== city) return false;
      if (openOnly && open !== true) return false;
      if (!q) return true;
      return (
        store.name.toLowerCase().includes(q) ||
        (store.description ?? "").toLowerCase().includes(q) ||
        (store.city ?? "").toLowerCase().includes(q)
      );
    });

    // Orden base: mejor calificación primero (más reseñas como desempate).
    // Con «cerca de mí» activo: distancia primero, calificación después.
    filtered.sort((a, b) => {
      if (coords) {
        if (a.km !== null && b.km !== null && a.km !== b.km)
          return a.km - b.km;
        if (a.km !== null && b.km === null) return -1;
        if (a.km === null && b.km !== null) return 1;
      }
      const ratingDiff = (b.store.ratingAvg ?? 0) - (a.store.ratingAvg ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return b.store.ratingCount - a.store.ratingCount;
    });

    return filtered;
  }, [stores, query, city, category, openOnly, coords]);

  const chipBase =
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors";

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className={`${chipBase} ${
              coords
                ? "border-brand bg-brand text-white"
                : "border-input hover:bg-accent"
            }`}
          >
            {locating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LocateFixed className="size-3.5" />
            )}
            {locating ? t("locating") : t("nearMe")}
          </button>
          <button
            type="button"
            onClick={() => setOpenOnly((v) => !v)}
            className={`${chipBase} ${
              openOnly
                ? "border-brand bg-brand text-white"
                : "border-input hover:bg-accent"
            }`}
          >
            <Clock className="size-3.5" />
            {t("openNow")}
          </button>
          {cities.length > 0 ? (
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label={t("cityAll")}
              className="border-input h-9 rounded-full border bg-transparent px-3 text-sm"
            >
              <option value="all">{t("cityAll")}</option>
              {cities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ) : null}
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
          {visible.map(({ store, open, km }) => (
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
                {open !== null ? (
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-sm ${
                      open
                        ? "bg-green-500/90 text-white"
                        : "bg-zinc-800/80 text-white"
                    }`}
                  >
                    {open ? t("open") : t("closed")}
                  </span>
                ) : null}
                {km !== null ? (
                  <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-sm">
                    {t("distanceKm", {
                      km: km < 10 ? km.toFixed(1) : String(Math.round(km)),
                    })}
                  </span>
                ) : null}
              </div>

              <div className="relative flex flex-1 flex-col px-5 pb-5">
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

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-bold tracking-tight">{store.name}</p>
                  <ReviewsDialog
                    rating={
                      store.ratingAvg !== null
                        ? store.ratingAvg.toFixed(1)
                        : null
                    }
                    count={store.ratingCount}
                    reviews={store.reviews}
                  />
                </div>
                {store.storeCategory ? (
                  <p className="text-xs text-muted-foreground">
                    {tDash(`storeCat_${store.storeCategory}`)}
                  </p>
                ) : null}
                {store.description ? (
                  <p className="mt-1.5 line-clamp-2 text-sm font-light leading-relaxed text-muted-foreground">
                    {store.description}
                  </p>
                ) : null}

                {store.holidayName ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <CalendarDays className="mt-0.5 size-3.5 shrink-0" />
                    {t("holidayNotice", { name: store.holidayName })}
                  </p>
                ) : null}

                <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                  {store.schedule ? (
                    <p className="flex items-start gap-1.5">
                      <Clock className="mt-0.5 size-3.5 shrink-0" />
                      <span className="line-clamp-2 whitespace-pre-line">
                        {store.schedule}
                      </span>
                    </p>
                  ) : null}
                  {store.address || store.city ? (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="line-clamp-1">
                        {[store.address, store.city]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </p>
                  ) : null}
                  {store.phone ? (
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0" />
                      <a
                        href={`tel:${store.phone}`}
                        className="hover:underline"
                      >
                        {store.phone}
                      </a>
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {store.deliveryEstMin !== null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
                      <Bike className="size-3" />
                      {t("delivery")} ±{store.deliveryEstMin} min
                    </span>
                  ) : null}
                  {store.pickupEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
                      <ShoppingBag className="size-3" />
                      {t("pickup")}
                      {store.pickupEstMin !== null
                        ? ` ±${store.pickupEstMin} min`
                        : ""}
                    </span>
                  ) : null}
                  {store.avgTicketCents !== null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
                      <Receipt className="size-3" />
                      {t("avgTicket")}{" "}
                      {formatPrice(store.avgTicketCents, store.currency)}
                    </span>
                  ) : null}
                </div>

                <Button size="sm" asChild className="mt-4 w-full rounded-full">
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
