"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ProCelebration } from "@/components/shared/pro-celebration";

// El pago de Vendi Pro ocurre DENTRO de la app: Stripe Embedded Checkout
// en un drawer con el branding alrededor. Nada de redirecciones.
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export function BillingCard({ plan }: { plan: "free" | "pro" }) {
  const t = useTranslations("dashboard");
  const searchParams = useSearchParams();
  const billing = searchParams.get("billing");
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  if (billing === "success" && !celebrated) {
    return (
      <div className="max-w-md">
        <ProCelebration onClose={() => setCelebrated(true)} />
      </div>
    );
  }

  async function openPortal() {
    setLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
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

  async function startCheckout() {
    if (!stripePromise) {
      setUnavailable(true);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      if (res.status === 501) setUnavailable(true);
      return;
    }
    const data = await res.json();
    if (data.clientSecret) setClientSecret(data.clientSecret);
  }

  return (
    <>
      <Card className="max-w-md rounded-3xl shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="tracking-tight">
              {t("billingTitle")}
            </CardTitle>
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
              onClick={openPortal}
              disabled={loading}
              className="rounded-full"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("manageSubscription")}
            </Button>
          ) : (
            <Button
              onClick={startCheckout}
              disabled={loading}
              className="rounded-full"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("upgradeButton")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pago embebido con branding Vendi */}
      <Drawer
        open={Boolean(clientSecret)}
        onOpenChange={(open) => {
          if (!open) setClientSecret(null);
        }}
      >
        <DrawerContent className="max-h-[92dvh]">
          <div className="mx-auto w-full max-w-lg overflow-y-auto pb-8">
            <DrawerHeader>
              <DrawerTitle className="flex items-center justify-between tracking-tight">
                <span>
                  vendi<span className="text-brand">.</span>{" "}
                  <span className="font-light text-muted-foreground">Pro</span>
                </span>
                <span className="text-sm font-light text-muted-foreground">
                  9,99 €/mes
                </span>
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4">
              {clientSecret && stripePromise ? (
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              ) : null}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
