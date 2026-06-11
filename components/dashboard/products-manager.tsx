"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EyeOff,
  Eye,
  Loader2,
  PackageOpen,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
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
import { formatPrice } from "@/lib/format";

export interface ManagedProduct {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  imageUrl: string | null;
  stock: number;
  unlimitedStock: boolean;
  recommended: boolean;
  active: boolean;
  salesCount: number;
  categoryId: string | null;
}

export interface StoreOption {
  id: string;
  name: string;
  currency: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

type StockMode = "unlimited" | "limited" | "soldout";

export function ProductsManager({
  stores,
  products: initialProducts,
  categoriesByStore,
}: {
  stores: StoreOption[];
  products: ManagedProduct[];
  categoriesByStore: Record<string, CategoryOption[]>;
}) {
  const t = useTranslations("dashboard");
  const tToast = useTranslations("toasts");
  const router = useRouter();

  const [products, setProducts] = useState(initialProducts);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<ManagedProduct | "new" | null>(null);
  const [deleting, setDeleting] = useState<ManagedProduct | null>(null);
  const [saving, setSaving] = useState(false);

  // Estado del formulario del modal
  const [formStore, setFormStore] = useState(stores[0]?.id ?? "");
  const [stockMode, setStockMode] = useState<StockMode>("unlimited");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [newCategory, setNewCategory] = useState("");
  const [recommended, setRecommended] = useState(false);
  const [hidden, setHidden] = useState(false);

  const visible = useMemo(
    () =>
      filter === "all"
        ? products
        : products.filter((p) => p.storeId === filter),
    [products, filter]
  );

  const percent = useMemo(() => {
    const real = Number(price);
    const compare = Number(compareAt);
    if (!real || !compare || compare <= real) return null;
    return Math.round((1 - real / compare) * 100);
  }, [price, compareAt]);

  function openModal(product: ManagedProduct | "new") {
    setEditing(product);
    if (product === "new") {
      setFormStore(stores[0]?.id ?? "");
      setStockMode("unlimited");
      setPrice("");
      setCompareAt("");
      setCategoryId("");
      setRecommended(false);
      setHidden(false);
    } else {
      setRecommended(product.recommended);
      setHidden(!product.active);
      setFormStore(product.storeId);
      setStockMode(
        product.unlimitedStock
          ? "unlimited"
          : product.stock <= 0
            ? "soldout"
            : "limited"
      );
      setPrice((product.priceCents / 100).toFixed(2));
      setCompareAt(
        product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : ""
      );
      setCategoryId(product.categoryId ?? "");
    }
    setNewCategory("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const isNew = editing === "new";
    const storeId = isNew ? formStore : editing.storeId;

    // Categoría nueva al vuelo
    let finalCategory: string | null = categoryId || null;
    if (categoryId === "__new__" && newCategory.trim().length >= 2) {
      const res = await fetch(`/api/stores/${storeId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      finalCategory = res.ok ? (await res.json()).category.id : null;
    } else if (categoryId === "__new__") {
      finalCategory = null;
    }

    // Foto
    let imageUrl: string | undefined;
    const photo = form.get("photo") as File | null;
    if (photo && photo.size > 0) {
      const body = new FormData();
      body.append("file", photo);
      body.append("storeId", storeId);
      const res = await fetch("/api/uploads", { method: "POST", body });
      if (res.ok) imageUrl = (await res.json()).url as string;
      else toast.error(t("uploadFailed"));
    }

    const stockValue =
      stockMode === "limited" ? Number(form.get("stock") ?? 0) : 0;
    const payload: Record<string, unknown> = {
      name: form.get("name"),
      description: String(form.get("description") ?? "") || undefined,
      priceCents: Math.round(Number(price) * 100),
      compareAtCents:
        compareAt && percent ? Math.round(Number(compareAt) * 100) : null,
      stock: stockValue,
      unlimitedStock: stockMode === "unlimited",
      recommended,
      active: !hidden,
      categoryId: finalCategory,
      ...(imageUrl ? { imageUrl } : {}),
    };

    const res = await fetch(
      isNew
        ? `/api/stores/${storeId}/products`
        : `/api/stores/${storeId}/products/${editing.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(
        data?.error === "plan_limit" ? t("planLimit") : tToast("productFailed")
      );
      return;
    }
    toast.success(isNew ? tToast("productAdded") : t("productUpdated"));
    setEditing(null);
    router.refresh();
  }

  async function quickPatch(
    product: ManagedProduct,
    patch: Partial<Pick<ManagedProduct, "active" | "recommended">>
  ) {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, ...patch } : p))
    );
    const res = await fetch(
      `/api/stores/${product.storeId}/products/${product.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }
    );
    if (!res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? product : p))
      );
      toast.error(tToast("productFailed"));
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setProducts((prev) => prev.filter((p) => p.id !== target.id));
    const res = await fetch(
      `/api/stores/${target.storeId}/products/${target.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setProducts((prev) => [target, ...prev]);
      const data = await res.json().catch(() => null);
      toast.error(
        data?.error === "has_orders"
          ? t("productHasOrders")
          : tToast("productFailed")
      );
    } else {
      toast.success(t("productDeleted"));
      router.refresh();
    }
  }

  const current = editing === "new" ? null : editing;
  const currencyFor = (storeId: string) =>
    stores.find((s) => s.id === storeId)?.currency ?? "EUR";
  const modalCategories = categoriesByStore[formStore] ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => openModal("new")} className="rounded-full">
          <Plus className="size-4" />
          {t("createProductCta")}
        </Button>
        {stores.length > 1 ? (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t("filterByStore")}
            className="border-input h-9 rounded-full border bg-transparent px-3 text-sm"
          >
            <option value="all">{t("allStores")}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={t("tabProducts")}
          hint={t("noProductsYet")}
          className="max-w-md"
        />
      ) : (
        <div className="grid gap-2">
          {visible.map((product) => (
            <div
              key={product.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 shadow-soft"
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  className="size-11 rounded-xl object-cover"
                />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent">
                  <PackageOpen className="size-4 text-accent-foreground/60" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-bold tracking-tight">
                  {product.name}
                  {product.recommended ? (
                    <Sparkles className="size-3.5 shrink-0 text-brand" />
                  ) : null}
                  {!product.active ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[10px]"
                    >
                      {t("inactiveBadge")}
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {filter === "all" ? `${product.storeName} · ` : ""}
                  {t("salesLabel", { count: product.salesCount })}
                </p>
              </div>
              <span className="font-bold tracking-tight">
                {formatPrice(product.priceCents, currencyFor(product.storeId))}
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-full"
                  aria-label={t("editProductCta")}
                  onClick={() => openModal(product)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`size-8 rounded-full ${product.recommended ? "text-brand" : ""}`}
                  aria-label={
                    product.recommended
                      ? t("unfeatureAction")
                      : t("featureAction")
                  }
                  onClick={() =>
                    quickPatch(product, { recommended: !product.recommended })
                  }
                >
                  <Sparkles className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-full"
                  aria-label={
                    product.active ? t("hideAction") : t("showAction")
                  }
                  onClick={() =>
                    quickPatch(product, { active: !product.active })
                  }
                >
                  {product.active ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-full text-destructive"
                  aria-label={t("deleteProduct")}
                  onClick={() => setDeleting(product)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar producto */}
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
                {editing === "new"
                  ? t("createProductCta")
                  : t("editProductCta")}
              </DrawerTitle>
            </DrawerHeader>
            <form
              method="post"
              onSubmit={onSubmit}
              className="grid gap-4 px-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="pr-photo">
                  {current?.imageUrl ? t("photoChange") : t("photoLabel")}
                </Label>
                <div className="flex items-center gap-3">
                  {current?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.imageUrl}
                      alt=""
                      className="size-12 rounded-xl object-cover"
                    />
                  ) : null}
                  <Input
                    id="pr-photo"
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pr-name">{t("productName")}</Label>
                <Input
                  id="pr-name"
                  name="name"
                  minLength={2}
                  defaultValue={current?.name ?? ""}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pr-desc">{t("productDescription")}</Label>
                <Input
                  id="pr-desc"
                  name="description"
                  maxLength={1000}
                  defaultValue={current?.description ?? ""}
                />
              </div>

              {/* Precio real + comparación con % en vivo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pr-price">{t("realPriceLabel")}</Label>
                  <Input
                    id="pr-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pr-compare">{t("compareAtLabel")}</Label>
                  <Input
                    id="pr-compare"
                    type="number"
                    step="0.01"
                    min="0"
                    value={compareAt}
                    onChange={(e) => setCompareAt(e.target.value)}
                  />
                </div>
              </div>
              {percent ? (
                <p className="animate-fade-in -mt-2 text-xs font-bold text-brand">
                  {t("discountPreview", { percent })}
                </p>
              ) : null}

              {/* Stock: siempre | cantidad | agotado */}
              <div className="grid gap-2">
                <Label>{t("stockModeLabel")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["unlimited", t("stockUnlimited")],
                      ["limited", t("stockLimited")],
                      ["soldout", t("stockSoldOut")],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStockMode(value)}
                      className={`rounded-2xl border px-2 py-2 text-xs font-bold transition-colors ${
                        stockMode === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {stockMode === "limited" ? (
                  <Input
                    name="stock"
                    type="number"
                    min="1"
                    defaultValue={
                      current && current.stock > 0 ? current.stock : 10
                    }
                    required
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-sm font-medium">
                  {t("recommendedLabel")}
                  <Switch
                    checked={recommended}
                    onCheckedChange={setRecommended}
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-sm font-medium">
                  {t("hiddenLabel")}
                  <Switch checked={hidden} onCheckedChange={setHidden} />
                </label>
              </div>

              {/* Tienda (preseleccionada si solo hay una; fija al editar) */}
              <div className="grid gap-2">
                <Label htmlFor="pr-store">{t("storeSelectLabel")}</Label>
                <select
                  id="pr-store"
                  value={formStore}
                  onChange={(e) => {
                    setFormStore(e.target.value);
                    setCategoryId("");
                  }}
                  disabled={editing !== "new"}
                  className="border-input h-9 rounded-md border bg-transparent px-3 text-sm disabled:opacity-60"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría */}
              <div className="grid gap-2">
                <Label htmlFor="pr-category">{t("categoryLabel")}</Label>
                <select
                  id="pr-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                >
                  <option value="">—</option>
                  {modalCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value="__new__">{t("categoryNew")}</option>
                </select>
                {categoryId === "__new__" ? (
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder={t("categoryNamePrompt")}
                    minLength={2}
                  />
                ) : null}
              </div>

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
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteText")}</AlertDialogDescription>
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
