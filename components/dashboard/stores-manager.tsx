"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Store as StoreIcon,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  bannerPreset: string | null;
  schedule: string | null;
  phone: string | null;
  address: string | null;
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

  const [editing, setEditing] = useState<ManagedStore | "new" | null>(null);
  const [deleting, setDeleting] = useState<ManagedStore | null>(null);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [preset, setPreset] = useState<string | null>(null);
  const [customBanner, setCustomBanner] = useState(false);

  function openModal(store: ManagedStore | "new") {
    setEditing(store);
    setPreset(store === "new" ? null : store.bannerPreset);
    setCustomBanner(store !== "new" && Boolean(store.bannerUrl));
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

    const base = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? "") || undefined,
      schedule: String(form.get("schedule") ?? "") || undefined,
      phone: String(form.get("phone") ?? "") || undefined,
      address: String(form.get("address") ?? "") || undefined,
      pickupEnabled: form.get("pickup") === "on",
      legalName: String(form.get("legalName") ?? "") || undefined,
      legalTaxId: String(form.get("legalTaxId") ?? "") || undefined,
      ...(preset && !customBanner ? { bannerPreset: preset } : {}),
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
    } else if (preset && !customBanner) {
      patch.bannerUrl = null;
      patch.bannerPreset = preset;
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
                {store.stripeAccountId ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto gap-1 rounded-full"
                  >
                    <VendiLiveDot />
                    <CreditCard className="size-3" />
                  </Badge>
                ) : null}
              </div>

              {/* Las 3 acciones canónicas de la tarjeta */}
              <div className="flex flex-wrap gap-2">
                {!store.stripeAccountId ? (
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
                    {t("connectButton")}
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
          <div className="mx-auto w-full max-w-lg overflow-y-auto pb-8">
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
                <Label htmlFor="st-schedule">{t("scheduleLabel2")}</Label>
                <textarea
                  id="st-schedule"
                  name="schedule"
                  rows={2}
                  maxLength={500}
                  defaultValue={current?.schedule ?? ""}
                  placeholder={t("schedulePlaceholder")}
                  className="border-input rounded-md border bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
                <span className="grid">
                  <span className="font-medium">{t("pickupLabel")}</span>
                  <span className="text-xs font-light text-muted-foreground">
                    {t("pickupHint")}
                  </span>
                </span>
                <Switch
                  name="pickup"
                  defaultChecked={current?.pickupEnabled ?? false}
                />
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
