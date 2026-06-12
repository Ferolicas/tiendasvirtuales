"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Store as StoreIcon,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { VendiLiveDot } from "@/components/shared/vendi-dot";
import { Link } from "@/i18n/navigation";
import type { AccountProfile } from "@/components/dashboard/account-panel";
import { formatHours, type StoreHoursRow } from "@/lib/schedule";

// Países para el aviso de festivos de Explorar (ISO 3166-1 alfa-2; los
// nombres salen de Intl.DisplayNames en el idioma del usuario).
const COUNTRY_CODES = [
  "ES", "MX", "CO", "AR", "CL", "PE", "EC", "UY", "PY", "BO", "VE",
  "CR", "PA", "DO", "GT", "HN", "SV", "NI", "US", "CA", "BR", "PT",
  "FR", "DE", "IT", "GB", "NL", "BE", "IE", "CH", "AT",
];

// Horas en pasos de 15 min ("00:00".."23:45") + opción de hora libre.
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

function TimeField({
  value,
  onChange,
  label,
  customLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  customLabel: string;
}) {
  const isCustom = !TIME_OPTIONS.includes(value);
  if (isCustom) {
    return (
      <input
        type="time"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
      />
    );
  }
  return (
    <select
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value === "custom" ? "" : e.target.value)}
      className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
    >
      {TIME_OPTIONS.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
      <option value="custom">{customLabel}</option>
    </select>
  );
}
import {
  CATEGORY_BANNER,
  STORE_CATEGORIES,
  type StoreCategory,
} from "@/lib/verticals";

const PRESETS = [
  "comidas",
  "ropa",
  "tecnologia",
  "deportes",
  "finanzas",
  "belleza",
] as const;

export interface ManagedStore {
  id: string;
  name: string;
  slug: string;
  storeCategory: string | null;
  chargesEnabled: boolean;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  bannerPreset: string | null;
  schedule: string | null;
  hours: StoreHoursRow[] | null;
  timeFormat: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  pickupEnabled: boolean;
  legalName: string | null;
  legalTaxId: string | null;
  stripeAccountId: string | null;
}

export function StoresManager({
  stores,
  profile,
}: {
  stores: ManagedStore[];
  profile: AccountProfile;
}) {
  const t = useTranslations("dashboard");
  const tEmpty = useTranslations("empty");
  const tToast = useTranslations("toasts");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Al volver del onboarding de Stripe: verificar contra Stripe si la
  // cuenta quedó habilitada DE VERDAD (charges_enabled).
  useEffect(() => {
    if (searchParams.get("connect") !== "done") return;
    const pending = stores.filter(
      (s) => s.stripeAccountId && !s.chargesEnabled
    );
    if (pending.length === 0) return;
    void Promise.all(
      pending.map((s) =>
        fetch(`/api/stores/${s.id}/connect`).then((r) =>
          r.ok ? r.json() : null
        )
      )
    ).then((results) => {
      if (results.some((r) => r?.connected)) {
        toast.success(t("connectDoneToast"));
      }
      router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [editing, setEditing] = useState<ManagedStore | "new" | null>(null);
  const [deleting, setDeleting] = useState<ManagedStore | null>(null);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [customBanner, setCustomBanner] = useState(false);
  const [pickup, setPickup] = useState(false);
  const [category, setCategory] = useState<string>("moda");
  // Coordenadas para «cerca de mí» en Explorar (se capturan con el botón
  // de ubicación, nunca se escriben a mano).
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [hoursRows, setHoursRows] = useState<StoreHoursRow[]>([]);
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState<"24h" | "12h">("24h");
  const [country, setCountry] = useState("");
  const locale = useLocale();
  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({
      code,
      name: names.of(code) ?? code,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [locale]);

  function updateHourRow(
    index: number,
    field: keyof StoreHoursRow,
    value: string
  ) {
    setHoursRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function openModal(store: ManagedStore | "new") {
    setEditing(store);
    setPreset(store === "new" ? null : store.bannerPreset);
    setCustomBanner(store !== "new" && Boolean(store.bannerUrl));
    setPickup(store === "new" ? false : store.pickupEnabled);
    setCategory(
      store === "new" ? "moda" : (store.storeCategory ?? "moda")
    );
    setGeo(
      store !== "new" && store.latitude !== null && store.longitude !== null
        ? { lat: store.latitude, lng: store.longitude }
        : null
    );
    // Una sola fila de todos los días con apertura = cierre significa
    // «abierto 24/7»: se muestra como interruptor, no como fila editable.
    const rows = store === "new" ? [] : (store.hours ?? []);
    const always =
      rows.length === 1 &&
      rows[0].days === "all" &&
      rows[0].open === rows[0].close;
    setAlwaysOpen(always);
    setHoursRows(always ? [] : rows);
    setTimeFormat(
      store !== "new" && store.timeFormat === "12h" ? "12h" : "24h"
    );
    setCountry(store === "new" ? "" : (store.country ?? ""));
  }

  function captureLocation() {
    if (!("geolocation" in navigator)) {
      toast.error(t("locationFailed"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success(t("locationSet"));
      },
      () => {
        setLocating(false);
        toast.error(t("locationFailed"));
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  async function uploadFile(
    file: File | null,
    storeId: string,
    kind: "logo" | "product"
  ): Promise<string | undefined> {
    if (!file || file.size === 0) return undefined;
    const body = new FormData();
    body.append("file", file);
    body.append("storeId", storeId);
    body.append("kind", kind);
    const res = await fetch("/api/uploads", { method: "POST", body });
    if (!res.ok) {
      toast.error(t("uploadFailed"));
      return undefined;
    }
    return (await res.json()).url as string;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const isNew = editing === "new";

    const cleanHours = alwaysOpen
      ? [{ days: "all", open: "00:00", close: "00:00" }]
      : hoursRows.filter(
          (r) => /^\d{2}:\d{2}$/.test(r.open) && /^\d{2}:\d{2}$/.test(r.close)
        );

    // Sin banner elegido: se sugiere el predefinido de la categoría.
    const effectivePreset =
      !customBanner && !preset
        ? CATEGORY_BANNER[category as StoreCategory]
        : preset;

    const base = {
      name: String(form.get("name") ?? ""),
      storeCategory: category,
      description: String(form.get("description") ?? "") || undefined,
      hours: cleanHours,
      schedule: formatHours(cleanHours, timeFormat) || undefined,
      timeFormat,
      phone: String(form.get("phone") ?? "") || undefined,
      address: String(form.get("address") ?? "") || undefined,
      city: String(form.get("city") ?? "") || undefined,
      country: country || undefined,
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      pickupEnabled: pickup,
      legalName: String(form.get("legalName") ?? "") || undefined,
      legalTaxId: String(form.get("legalTaxId") ?? "") || undefined,
      ...(effectivePreset && !customBanner
        ? { bannerPreset: effectivePreset }
        : {}),
    };

    let storeId = isNew ? null : editing.id;

    if (isNew) {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(base),
      });
      if (!res.ok) {
        setSaving(false);
        const data = await res.json().catch(() => null);
        toast.error(
          data?.error === "plan_limit"
            ? t("planLimit")
            : t("createStoreError")
        );
        return;
      }
      storeId = (await res.json()).store.id as string;
    }

    // Subidas (necesitan el id de la tienda) + PATCH final
    const logoUrl = await uploadFile(
      form.get("logo") as File | null,
      storeId as string,
      "logo"
    );
    const bannerUrl = customBanner
      ? await uploadFile(
          form.get("banner") as File | null,
          storeId as string,
          "product"
        )
      : undefined;

    const patch: Record<string, unknown> = { ...base };
    if (logoUrl) patch.logoUrl = logoUrl;
    if (bannerUrl) {
      patch.bannerUrl = bannerUrl;
      patch.bannerPreset = null;
    } else if (effectivePreset && !customBanner) {
      patch.bannerUrl = null;
      patch.bannerPreset = effectivePreset;
    }

    const res = await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(tToast("settingsFailed"));
      return;
    }
    toast.success(isNew ? tToast("storeCreated") : tToast("settingsSaved"));
    setEditing(null);
    router.refresh();
  }

  async function onDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    const res = await fetch(`/api/stores/${target.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("storeDeleted"));
      router.refresh();
    } else {
      toast.error(tToast("settingsFailed"));
    }
  }

  async function onConnect(store: ManagedStore) {
    setConnecting(store.id);
    const res = await fetch(`/api/stores/${store.id}/connect`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }
    setConnecting(null);
    if (res.status === 501) toast.error(t("billingUnavailable"));
  }

  const current = editing === "new" ? null : editing;

  return (
    <div className="grid gap-6">
      <Button onClick={() => openModal("new")} className="w-fit rounded-full">
        <Plus className="size-4" />
        {t("createStoreCta")}
      </Button>

      {stores.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title={tEmpty("storesTitle")}
          hint={tEmpty("storesHint")}
          className="max-w-md"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {stores.map((store) => (
            <div
              key={store.id}
              className="hover-lift grid gap-3 rounded-3xl border bg-card p-5 shadow-soft"
            >
              <div className="flex items-center gap-3">
                {store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={store.logoUrl}
                    alt=""
                    className="size-12 rounded-2xl border object-cover"
                  />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-lg font-extrabold text-accent-foreground">
                    {store.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold tracking-tight">
                    {store.name}
                  </p>
                  <Link
                    href={`/s/${store.slug}`}
                    target="_blank"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    /s/{store.slug}
                  </Link>
                </div>
                {store.chargesEnabled ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto gap-1 rounded-full"
                  >
                    <VendiLiveDot />
                    <CreditCard className="size-3" />
                  </Badge>
                ) : store.stripeAccountId ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  >
                    {t("connectPendingStripe")}
                  </Badge>
                ) : null}
              </div>

              {/* Las 3 acciones canónicas de la tarjeta */}
              <div className="flex flex-wrap gap-2">
                {!store.chargesEnabled ? (
                  <Button
                    size="sm"
                    onClick={() => onConnect(store)}
                    disabled={connecting === store.id}
                    className="rounded-full"
                  >
                    {connecting === store.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="size-3.5" />
                    )}
                    {store.stripeAccountId
                      ? t("connectContinue")
                      : t("connectButton")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openModal(store)}
                  className="rounded-full"
                >
                  <Pencil className="size-3.5" />
                  {t("editStoreCta")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleting(store)}
                  className="rounded-full text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  {t("deleteStoreCta")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de creación/edición */}
      <Drawer
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DrawerContent className="max-h-[92dvh]">
          <div className="mx-auto w-full min-h-0 max-w-lg flex-1 overflow-y-auto pb-8">
            <DrawerHeader>
              <DrawerTitle className="tracking-tight">
                {editing === "new" ? t("createStoreCta") : t("editStoreCta")}
              </DrawerTitle>
            </DrawerHeader>
            <form
              method="post"
              onSubmit={onSubmit}
              className="grid gap-4 px-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="st-name">{t("storeName")}</Label>
                <Input
                  id="st-name"
                  name="name"
                  minLength={2}
                  maxLength={80}
                  defaultValue={current?.name ?? ""}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="st-category">{t("storeCategoryLabel")}</Label>
                <select
                  id="st-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                >
                  {STORE_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {t(`storeCat_${value}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="st-desc">{t("storeDescription")}</Label>
                <Input
                  id="st-desc"
                  name="description"
                  maxLength={500}
                  defaultValue={current?.description ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="st-logo">
                  {current?.logoUrl ? t("photoChange") : t("logoTitle")}
                </Label>
                <div className="flex items-center gap-3">
                  {current?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.logoUrl}
                      alt=""
                      className="size-12 rounded-xl border object-cover"
                    />
                  ) : null}
                  <Input
                    id="st-logo"
                    name="logo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                  />
                </div>
              </div>

              {/* Banner: 6 predefinidos o subir propio */}
              <div className="grid gap-2">
                <Label>{t("bannerLabel")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setPreset(value);
                        setCustomBanner(false);
                      }}
                      className={`overflow-hidden rounded-xl border-2 transition-all ${
                        preset === value && !customBanner
                          ? "border-brand"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/banners/${value}.svg`}
                        alt=""
                        className="h-12 w-full object-cover"
                      />
                      <span className="block py-1 text-[10px] font-bold uppercase tracking-wider">
                        {t(`bannerPreset_${value}`)}
                      </span>
                    </button>
                  ))}
                </div>
                <label className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-2.5 text-sm font-medium">
                  {t("bannerCustom")}
                  <Switch
                    checked={customBanner}
                    onCheckedChange={setCustomBanner}
                  />
                </label>
                {customBanner ? (
                  <Input
                    name="banner"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                  />
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label>{t("scheduleLabel2")}</Label>
                <label className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-2.5 text-sm font-medium">
                  {t("alwaysOpenLabel")}
                  <Switch checked={alwaysOpen} onCheckedChange={setAlwaysOpen} />
                </label>
                {alwaysOpen ? null : (
                <>
                {hoursRows.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2"
                  >
                    <select
                      value={row.days}
                      onChange={(e) => updateHourRow(i, "days", e.target.value)}
                      aria-label={t("hoursDays")}
                      className="border-input h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm"
                    >
                      <option value="all">{t("daysAll")}</option>
                      <option value="weekdays">L-V</option>
                      <option value="weekend">S-D</option>
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <option key={d} value={String(d)}>
                          {t(`day_${d}`)}
                        </option>
                      ))}
                    </select>
                    <TimeField
                      value={row.open}
                      onChange={(v) => updateHourRow(i, "open", v)}
                      label={t("hoursOpen")}
                      customLabel={t("hoursCustom")}
                    />
                    <TimeField
                      value={row.close}
                      onChange={(v) => updateHourRow(i, "close", v)}
                      label={t("hoursClose")}
                      customLabel={t("hoursCustom")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("hoursRemove")}
                      className="size-8 rounded-full text-muted-foreground"
                      onClick={() =>
                        setHoursRows((rows) => rows.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit rounded-full"
                  onClick={() =>
                    setHoursRows((rows) => [
                      ...rows,
                      { days: "all", open: "09:00", close: "20:00" },
                    ])
                  }
                >
                  <Plus className="size-3.5" />
                  {t("hoursAdd")}
                </Button>
                {hoursRows.length > 0 ? (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("timeFormatLabel")}
                    </span>
                    {(["24h", "12h"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTimeFormat(value)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                          timeFormat === value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {value === "24h"
                          ? t("timeFormat24")
                          : t("timeFormat12")}
                      </button>
                    ))}
                  </div>
                ) : null}
                {hoursRows.length === 0 && current?.schedule ? (
                  <p className="text-xs font-light text-muted-foreground">
                    {t("hoursLegacy", { schedule: current.schedule })}
                  </p>
                ) : null}
                </>
                )}
              </div>

              <label className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
                <span className="grid">
                  <span className="font-medium">{t("pickupLabel")}</span>
                  <span className="text-xs font-light text-muted-foreground">
                    {t("pickupHint")}
                  </span>
                </span>
                <Switch checked={pickup} onCheckedChange={setPickup} />
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit rounded-full"
                onClick={(e) => {
                  const form = (e.target as HTMLElement).closest("form");
                  if (!form) return;
                  const set = (n: string, v: string | null) => {
                    const input = form.querySelector<HTMLInputElement>(
                      `[name='${n}']`
                    );
                    if (input && v) input.value = v;
                  };
                  set("phone", profile.phone);
                  set("address", profile.address);
                  set("legalName", profile.name);
                  set("legalTaxId", profile.taxId);
                }}
              >
                <UserCheck className="size-3.5" />
                {t("useMyData")}
              </Button>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="st-phone">{t("storePhoneLabel")}</Label>
                  <Input
                    id="st-phone"
                    name="phone"
                    type="tel"
                    defaultValue={current?.phone ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="st-address">{t("accountAddress")}</Label>
                  <Input
                    id="st-address"
                    name="address"
                    defaultValue={current?.address ?? ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="st-city">{t("cityLabel")}</Label>
                  <Input
                    id="st-city"
                    name="city"
                    defaultValue={current?.city ?? ""}
                    placeholder={t("cityPlaceholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="st-country">{t("countryLabel")}</Label>
                  <select
                    id="st-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
                  >
                    <option value="">—</option>
                    {countryOptions.map(({ code, name }) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={locating}
                onClick={captureLocation}
                className="w-fit rounded-full"
              >
                {locating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MapPin
                    className={`size-3.5 ${geo ? "text-green-600" : ""}`}
                  />
                )}
                {geo ? t("locationSaved") : t("useMyLocation")}
              </Button>
              <p className="-mt-2 text-xs font-light text-muted-foreground">
                {t("locationHint")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="st-legal">{t("responsibleLabel")}</Label>
                  <Input
                    id="st-legal"
                    name="legalName"
                    defaultValue={current?.legalName ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="st-doc">{t("responsibleDocLabel")}</Label>
                  <Input
                    id="st-doc"
                    name="legalTaxId"
                    defaultValue={current?.legalTaxId ?? ""}
                  />
                </div>
              </div>

              {current ? (
                <Link
                  href={`/dashboard/stores/${current.id}`}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  {t("advancedSettings")}
                </Link>
              ) : null}

              <Button type="submit" disabled={saving} className="rounded-full">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("saveButton")}
              </Button>
            </form>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Confirmación de borrado */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteStoreTitle", { name: deleting?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteStoreText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {t("keepOrder")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={onDelete}
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
