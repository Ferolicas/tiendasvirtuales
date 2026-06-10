"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BuyForm({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        customerName: form.get("name"),
        customerEmail: form.get("email"),
        items: [
          { productId, quantity: Number(form.get("quantity") ?? 1) },
        ],
      }),
    });

    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <p className="text-sm font-medium text-green-600">
        ¡Pedido enviado! La tienda se pondrá en contacto contigo.
      </p>
    );
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Comprar
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor={`name-${productId}`}>Tu nombre</Label>
        <Input id={`name-${productId}`} name="name" minLength={2} required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`email-${productId}`}>Tu email</Label>
        <Input
          id={`email-${productId}`}
          name="email"
          type="email"
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`quantity-${productId}`}>Cantidad</Label>
        <Input
          id={`quantity-${productId}`}
          name="quantity"
          type="number"
          min="1"
          max="99"
          defaultValue="1"
        />
      </div>
      {status === "error" ? (
        <p className="text-sm text-destructive">
          No se pudo enviar el pedido. Inténtalo de nuevo.
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Confirmar pedido"}
      </Button>
    </form>
  );
}
