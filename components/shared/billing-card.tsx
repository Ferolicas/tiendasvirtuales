"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProCelebration } from "@/components/shared/pro-celebration";

// Vendi Pro se cobra por Mercado Pago (pago manual mensual, $50.000 COP). Al
// pulsar se crea la preferencia y se redirige a Mercado Pago; al volver con
// billing=success se celebra. Renovar es el mismo botón.
export function BillingCard({
  plan,
  proUntil,
}: {
  plan: "free" | "pro";
  proUntil: string | null;
}) {
  const t = useTranslations("dashboard");
  const searchParams = useSearchParams();
  const billing = searchParams.get("billing");
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  if (billing === "success" && !celebrated) {
    return (
      <div className="max-w-md">
        <ProCelebration onClose={() => setCelebrated(true)} />
      </div>
    );
  }

  async function startCheckout() {
    setLoading(true);
    const res = await fetch("/api/billing/mp-subscribe", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
    }
    setLoading(false);
    if (res.status === 501) setUnavailable(true);
  }

  const proUntilText =
    plan === "pro" && proUntil
      ? new Date(proUntil).toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <Card className="max-w-md rounded-3xl shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="tracking-tight">{t("billingTitle")}</CardTitle>
          <Badge
            className="rounded-full"
            variant={plan === "pro" ? "default" : "secondary"}
          >
            {plan}
          </Badge>
        </div>
        <CardDescription>
          {plan === "pro" ? t("billingProText") : t("billingFreeText")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {billing === "cancelled" ? (
          <p className="animate-fade-in rounded-2xl bg-secondary p-3 text-sm text-muted-foreground">
            {t("billingCancelled")}
          </p>
        ) : null}
        {billing === "pending" ? (
          <p className="animate-fade-in rounded-2xl bg-secondary p-3 text-sm text-muted-foreground">
            {t("billingPending")}
          </p>
        ) : null}
        {proUntilText ? (
          <p className="text-sm text-muted-foreground">
            {t("proUntilLabel", { date: proUntilText })}
          </p>
        ) : null}
        {unavailable ? (
          <p className="text-sm text-muted-foreground">
            {t("billingUnavailable")}
          </p>
        ) : null}
        <Button
          onClick={startCheckout}
          disabled={loading}
          variant={plan === "pro" ? "outline" : "default"}
          className="rounded-full"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {plan === "pro" ? t("renewButton") : t("upgradeButton")}
        </Button>
      </CardContent>
    </Card>
  );
}
