"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPrice } from "@/lib/format";

interface PanelProduct {
  id: string;
  name: string;
  priceCents: number;
  optimistic?: boolean;
}

// Alta de producto con optimistic UI: el producto aparece en la lista al
// instante (atenuado) y se reconcilia con la respuesta del servidor; si
// falla, se retira con un toast de error.
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const name = String(form.get("name") ?? "");
    const priceCents = Math.round(Number(form.get("price")) * 100);
    const payload = {
      name,
      description: form.get("description") || undefined,
      priceCents,
      stock: Number(form.get("stock") ?? 0),
    };

    // Optimista: entra ya en la lista y el formulario queda libre.
    const tempId = `optimistic-${Date.now()}`;
    setProducts((prev) => [
      { id: tempId, name, priceCents, optimistic: true },
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
      prev.map((p) =>
        p.id === tempId
          ? { id: product.id, name: product.name, priceCents: product.priceCents }
          : p
      )
    );
    toast.success(tToast("productAdded"));
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="product-name">{t("productName")}</Label>
          <Input id="product-name" name="name" minLength={2} required />
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
        <Button type="submit" className="rounded-full">
          {t("addProductButton")}
        </Button>
      </form>

      <div className="grid gap-3">
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
            <div
              key={product.id}
              className={`flex items-center justify-between border-b pb-2 text-sm transition-opacity last:border-0 ${
                product.optimistic ? "animate-fade-up opacity-50" : ""
              }`}
            >
              <span>{product.name}</span>
              <span className="font-medium">
                {formatPrice(product.priceCents, currency)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
