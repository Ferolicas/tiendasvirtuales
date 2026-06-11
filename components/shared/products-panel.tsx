"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageOpen, Pencil } from "lucide-react";
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

interface PanelProduct {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
  imageUrl: string | null;
  optimistic?: boolean;
}

// Catálogo con optimistic UI completo: alta instantánea, edición en drawer,
// visibilidad con switch y eliminación con confirmación.
export function ProductsPanel({
  storeId,
  currency,
  initialProducts,
}: {
  storeId: string;
  currency: string;
  initialProducts: PanelProduct[];
}) {
  const t = useTranslations("dashboard");
  const tToast = useTranslations("toasts");
  const tEmpty = useTranslations("empty");
  const router = useRouter();
  const [products, setProducts] = useState<PanelProduct[]>(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PanelProduct | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  // Sube la foto al servidor (sharp → WebP) y devuelve su URL pública.
  async function uploadPhoto(file: File | null): Promise<string | undefined> {
    if (!file || file.size === 0) return undefined;
    const body = new FormData();
    body.append("file", file);
    body.append("storeId", storeId);
    const res = await fetch("/api/uploads", { method: "POST", body });
    if (!res.ok) {
      toast.error(t("uploadFailed"));
      return undefined;
    }
    const data = await res.json();
    return data.url as string;
  }

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setCreating(true);
    const imageUrl = await uploadPhoto(form.get("photo") as File | null);
    setCreating(false);

    const name = String(form.get("name") ?? "");
    const priceCents = Math.round(Number(form.get("price")) * 100);
    const payload = {
      name,
      description: form.get("description") || undefined,
      priceCents,
      stock: Number(form.get("stock") ?? 0),
      imageUrl,
    };

    const tempId = `optimistic-${Date.now()}`;
    setProducts((prev) => [
      {
        id: tempId,
        name,
        description: null,
        priceCents,
        stock: payload.stock,
        active: true,
        imageUrl: imageUrl ?? null,
        optimistic: true,
      },
      ...prev,
    ]);
    formElement.reset();

    const res = await fetch(`/api/stores/${storeId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== tempId));
      const data = await res.json().catch(() => null);
      const message =
        data?.error === "plan_limit" ? t("planLimit") : tToast("productFailed");
      setError(message);
      toast.error(message);
      return;
    }

    const { product } = await res.json();
    setProducts((prev) =>
      prev.map((p) => (p.id === tempId ? { ...product } : p))
    );
    toast.success(tToast("productAdded"));
    router.refresh();
  }

  async function onEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const newPhoto = await uploadPhoto(form.get("photo") as File | null);
    const payload = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? "") || null,
      priceCents: Math.round(Number(form.get("price")) * 100),
      stock: Number(form.get("stock") ?? 0),
      ...(newPhoto ? { imageUrl: newPhoto } : {}),
    };

    const res = await fetch(
      `/api/stores/${storeId}/products/${editing.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      toast.error(tToast("productFailed"));
      return;
    }
    const { product } = await res.json();
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...product } : p))
    );
    setEditing(null);
    toast.success(t("productUpdated"));
    router.refresh();
  }

  async function toggleActive(product: PanelProduct, active: boolean) {
    // Optimista: el switch responde al instante.
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, active } : p))
    );
    setEditing((prev) =>
      prev && prev.id === product.id ? { ...prev, active } : prev
    );
    const res = await fetch(
      `/api/stores/${storeId}/products/${product.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      }
    );
    if (!res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, active: !active } : p
        )
      );
      toast.error(tToast("productFailed"));
      return;
    }
    router.refresh();
  }

  async function onDelete() {
    if (!editing) return;
    const target = editing;
    setConfirmDelete(false);
    setEditing(null);
    // Optimista con rollback si el servidor lo rechaza.
    setProducts((prev) => prev.filter((p) => p.id !== target.id));

    const res = await fetch(
      `/api/stores/${storeId}/products/${target.id}`,
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
      return;
    }
    toast.success(t("productDeleted"));
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <form method="post" onSubmit={onCreate} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="product-name">{t("productName")}</Label>
          <Input id="product-name" name="name" minLength={2} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-photo">{t("photoLabel")}</Label>
          <Input
            id="product-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-description">
            {t("productDescription")}
          </Label>
          <Input
            id="product-description"
            name="description"
            maxLength={1000}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-price">{t("price")}</Label>
            <Input
              id="product-price"
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-stock">{t("stock")}</Label>
            <Input
              id="product-stock"
              name="stock"
              type="number"
              min="0"
              defaultValue="0"
            />
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={creating} className="rounded-full">
          {creating ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("addProductButton")}
        </Button>
      </form>

      <div className="grid gap-1.5">
        <p className="text-sm font-bold tracking-tight">
          {t("products")} ({products.length})
        </p>
        {products.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={tEmpty("productsTitle")}
            hint={tEmpty("productsHint")}
          />
        ) : (
          products.map((product) => (
            <button
              key={product.id}
              type="button"
              disabled={product.optimistic}
              onClick={() => setEditing(product)}
              className={`group flex items-center justify-between rounded-xl border border-transparent px-2 py-2 text-left text-sm transition-colors hover:border-border hover:bg-secondary/60 ${
                product.optimistic ? "animate-fade-up opacity-50" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="size-8 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
                    <PackageOpen className="size-3.5 text-accent-foreground/60" />
                  </span>
                )}
                {product.name}
                {!product.active ? (
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    {t("inactiveBadge")}
                  </Badge>
                ) : null}
              </span>
              <span className="flex items-center gap-2 font-medium">
                {formatPrice(product.priceCents, currency)}
                <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </button>
          ))
        )}
      </div>

      {/* Drawer de edición */}
      <Drawer
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DrawerContent>
          {editing ? (
            <div className="mx-auto w-full max-w-md pb-8">
              <DrawerHeader>
                <DrawerTitle>{t("editProduct")}</DrawerTitle>
              </DrawerHeader>
              <form method="post" onSubmit={onEdit} className="grid gap-4 px-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-photo">
                    {editing.imageUrl ? t("photoChange") : t("photoLabel")}
                  </Label>
                  <div className="flex items-center gap-3">
                    {editing.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editing.imageUrl}
                        alt=""
                        className="size-14 rounded-xl object-cover"
                      />
                    ) : null}
                    <Input
                      id="edit-photo"
                      name="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">{t("productName")}</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    minLength={2}
                    defaultValue={editing.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">
                    {t("productDescription")}
                  </Label>
                  <Input
                    id="edit-description"
                    name="description"
                    maxLength={1000}
                    defaultValue={editing.description ?? ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-price">{t("price")}</Label>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={(editing.priceCents / 100).toFixed(2)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-stock">{t("stock")}</Label>
                    <Input
                      id="edit-stock"
                      name="stock"
                      type="number"
                      min="0"
                      defaultValue={editing.stock}
                    />
                  </div>
                </div>
                <label className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-sm font-medium">
                  {t("activeLabel")}
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(checked) =>
                      toggleActive(editing, checked)
                    }
                  />
                </label>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-full"
                  >
                    {t("deleteProduct")}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="rounded-full"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    {t("saveButton")}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      {/* Confirmación de borrado */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
