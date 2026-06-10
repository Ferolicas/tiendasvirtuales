"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShippingForm({
  storeId,
  initialShippingCents,
}: {
  storeId: string;
  initialShippingCents: number;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingCents: Math.round(Number(form.get("shipping")) * 100),
      }),
    });
    setStatus(res.ok ? "saved" : "error");
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="shipping">{t("shippingLabel")}</Label>
        <Input
          id="shipping"
          name="shipping"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(initialShippingCents / 100).toFixed(2)}
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={status === "saving"}
          className="rounded-full"
        >
          {t("saveButton")}
        </Button>
        {status === "saved" ? (
          <span className="animate-fade-in text-sm font-medium text-green-600">
            {t("savedOk")}
          </span>
        ) : null}
        {status === "error" ? (
          <span className="text-sm text-destructive">{t("saveError")}</span>
        ) : null}
      </div>
    </form>
  );
}

export function ConnectButton({
  storeId,
  connected,
}: {
  storeId: string;
  connected: boolean;
}) {
  const t = useTranslations("dashboard");
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function onConnect() {
    setLoading(true);
    const res = await fetch(`/api/stores/${storeId}/connect`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }
    setLoading(false);
    if (res.status === 501) setUnavailable(true);
  }

  if (connected) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-green-600">
        <span className="inline-block size-2 rounded-full bg-green-500" />
        {t("connectActive")}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {unavailable ? (
        <p className="text-sm text-muted-foreground">
          {t("billingUnavailable")}
        </p>
      ) : null}
      <Button
        onClick={onConnect}
        disabled={loading}
        size="sm"
        className="w-fit rounded-full"
      >
        {loading ? t("connectLoading") : t("connectButton")}
      </Button>
    </div>
  );
}
