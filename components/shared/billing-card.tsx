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

// Periodos de la suscripción Pro con descuento por pago adelantado.
const PERIODS = [
  { id: "1", label: "1 mes", per: "$50.000/mes", price: "$50.000", save: null },
  {
    id: "3",
    label: "3 meses",
    per: "$45.000/mes",
    price: "$135.000",
    save: "-10%",
  },
  {
    id: "12",
    label: "1 año",
    per: "$40.000/mes",
    price: "$480.000",
    save: "-20%",
  },
] as const;

// Vendi Pro se cobra por Mercado Pago (pago adelantado, $50.000 COP/mes con
// descuento por 3 meses o 1 año). Al pulsar se crea la preferencia y se
// redirige a Mercado Pago; al volver con billing=success se celebra.
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
  const [period, setPeriod] = useState<string>("3");

  if (billing === "success" && !celebrated) {
    return (
      <div className="max-w-md">
        <ProCelebration onClose={() => setCelebrated(true)} />
      </div>
    );
  }

  async function startCheckout() {
    setLoading(true);
    const res = await fetch("/api/billing/mp-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
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

        {/* Elige periodo: 3 meses −10%, 1 año −20% */}
        <div className="grid gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-colors ${
                period === p.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/30"
              }`}
            >
              <div>
                <p className="text-sm font-bold tracking-tight">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.per}</p>
              </div>
              <div className="flex items-center gap-2">
                {p.save ? (
                  <Badge className="rounded-full bg-green-600/12 text-green-700 dark:text-green-300">
                    {p.save}
                  </Badge>
                ) : null}
                <span className="text-sm font-extrabold tracking-tight">
                  {p.price}
                </span>
              </div>
            </button>
          ))}
        </div>

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
