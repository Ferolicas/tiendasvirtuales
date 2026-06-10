"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateStoreForm() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);

    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || undefined,
        currency: form.get("currency") || "EUR",
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError(t("createStoreError"));
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="store-name">{t("storeName")}</Label>
        <Input
          id="store-name"
          name="name"
          minLength={2}
          maxLength={80}
          placeholder={t("storeNamePlaceholder")}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="store-description">{t("storeDescription")}</Label>
        <Input
          id="store-description"
          name="description"
          maxLength={500}
          placeholder={t("storeDescriptionPlaceholder")}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="store-currency">{t("currency")}</Label>
        <select
          id="store-currency"
          name="currency"
          defaultValue="EUR"
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="EUR">EUR €</option>
          <option value="USD">USD $</option>
          <option value="COP">COP $</option>
          <option value="MXN">MXN $</option>
        </select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading} className="rounded-full">
        {loading ? t("creating") : t("createStoreButton")}
      </Button>
    </form>
  );
}
