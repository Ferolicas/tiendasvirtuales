"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/shared/turnstile";

export function BuyForm({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const t = useTranslations("store");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "sending" | "redirect" | "done" | "error"
  >("idle");

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
        items: [{ productId, quantity: Number(form.get("quantity") ?? 1) }],
        turnstileToken: form.get("cf-turnstile-response") ?? undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.checkoutUrl) {
        setStatus("redirect");
        window.location.href = data.checkoutUrl;
        return;
      }
      setStatus("done");
      return;
    }
    setStatus("error");
  }

  if (status === "done") {
    return (
      <p className="animate-fade-in text-sm font-medium text-green-600">
        {t("orderDone")}
      </p>
    );
  }

  if (status === "redirect") {
    return (
      <p className="animate-fade-in text-sm text-muted-foreground">
        {t("redirecting")}
      </p>
    );
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="rounded-full">
        {t("buy")}
      </Button>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="animate-fade-in grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor={`name-${productId}`}>{t("yourName")}</Label>
        <Input id={`name-${productId}`} name="name" minLength={2} required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`email-${productId}`}>{t("yourEmail")}</Label>
        <Input id={`email-${productId}`} name="email" type="email" required />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`quantity-${productId}`}>{t("quantity")}</Label>
        <Input
          id={`quantity-${productId}`}
          name="quantity"
          type="number"
          min="1"
          max="99"
          defaultValue="1"
        />
      </div>
      <Turnstile />
      {status === "error" ? (
        <p className="text-sm text-destructive">{t("orderError")}</p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={status === "sending"}
        className="rounded-full"
      >
        {status === "sending" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : null}
        {status === "sending" ? t("sending") : t("confirmOrder")}
      </Button>
    </form>
  );
}
