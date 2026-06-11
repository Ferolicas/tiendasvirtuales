"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VendiLiveDot } from "@/components/shared/vendi-dot";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type PushState = "unsupported" | "denied" | "off" | "on" | "loading";

// Activación de notificaciones push de pedidos (Android/desktop directo;
// en iPhone requiere añadir la web a la pantalla de inicio).
export function PushCard() {
  const t = useTranslations("dashboard");
  const [state, setState] = useState<PushState>("loading");

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (
      !publicKey ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, [publicKey]);

  async function enable() {
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey as string),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error();
      setState("on");
      toast.success(t("pushEnabled"));
    } catch {
      setState("off");
      toast.error(t("pushFailed"));
    }
  }

  async function disable() {
    setState("loading");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  return (
    <Card className="max-w-md rounded-3xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 tracking-tight">
          <BellRing className="size-4 text-brand" />
          {t("pushTitle")}
        </CardTitle>
        <CardDescription>{t("pushText")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {state === "unsupported" ? (
          <p className="text-sm text-muted-foreground">{t("pushIosHint")}</p>
        ) : state === "denied" ? (
          <p className="text-sm text-muted-foreground">{t("pushDenied")}</p>
        ) : state === "on" ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <VendiLiveDot />
              {t("pushActive")}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={disable}
              className="rounded-full text-muted-foreground"
            >
              <BellOff className="size-3.5" />
              {t("pushDisable")}
            </Button>
          </div>
        ) : (
          <Button
            onClick={enable}
            disabled={state === "loading"}
            className="w-fit rounded-full"
          >
            {state === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BellRing className="size-4" />
            )}
            {t("pushEnable")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
