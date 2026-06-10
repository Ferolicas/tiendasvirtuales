"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateStoreForm() {
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
      setError("No se pudo crear la tienda. Revisa los datos.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="store-name">Nombre</Label>
        <Input
          id="store-name"
          name="name"
          minLength={2}
          maxLength={80}
          placeholder="Panadería La Espiga"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="store-description">Descripción (opcional)</Label>
        <Input
          id="store-description"
          name="description"
          maxLength={500}
          placeholder="Pan artesano y repostería"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="store-currency">Moneda</Label>
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
      <Button type="submit" disabled={loading}>
        {loading ? "Creando…" : "Crear tienda"}
      </Button>
    </form>
  );
}
