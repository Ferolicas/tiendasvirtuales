"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string; address: string };
}) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        address: form.get("address"),
      }),
    });
    setLoading(false);
    if (res.ok) toast.success("Datos guardados");
    else toast.error("No se pudo guardar");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="p-name">Nombre</Label>
        <Input
          id="p-name"
          name="name"
          minLength={2}
          defaultValue={initial.name}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p-email">Email</Label>
        <Input id="p-email" value={initial.email} disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p-phone">Teléfono</Label>
        <Input
          id="p-phone"
          name="phone"
          type="tel"
          defaultValue={initial.phone}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p-address">Dirección de envío</Label>
        <Input id="p-address" name="address" defaultValue={initial.address} />
      </div>
      <Button type="submit" disabled={loading} className="w-fit rounded-full">
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Guardar
      </Button>
    </form>
  );
}
