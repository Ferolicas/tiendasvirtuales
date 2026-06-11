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

export function BillingCard({ plan }: { plan: "free" | "pro" }) {
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

  async function go(endpoint: string) {
    setLoading(true);
    const res = await fetch(endpoint, { method: "POST" });
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
        {unavailable ? (
          <p className="text-sm text-muted-foreground">
            {t("billingUnavailable")}
          </p>
        ) : null}
        {plan === "pro" ? (
          <Button
            variant="outline"
            onClick={() => go("/api/billing/portal")}
            disabled={loading}
            className="rounded-full"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("manageSubscription")}
          </Button>
        ) : (
          <Button
            onClick={() => go("/api/billing/checkout")}
            disabled={loading}
            className="rounded-full"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("upgradeButton")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
