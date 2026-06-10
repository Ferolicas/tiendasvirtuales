"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddProductForm({ storeId }: { storeId: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const priceEuros = Number(form.get("price"));
    const res = await fetch(`/api/stores/${storeId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || undefined,
        priceCents: Math.round(priceEuros * 100),
        stock: Number(form.get("stock") ?? 0),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        data?.error === "plan_limit" ? t("planLimit") : t("addProductError")
      );
      return;
    }
    formElement.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="product-name">{t("productName")}</Label>
        <Input id="product-name" name="name" minLength={2} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="product-description">{t("productDescription")}</Label>
        <Input id="product-description" name="description" maxLength={1000} />
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
      <Button type="submit" disabled={loading} className="rounded-full">
        {loading ? t("saving") : t("addProductButton")}
      </Button>
    </form>
  );
}
