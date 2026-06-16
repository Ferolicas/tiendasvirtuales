"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type PushState = "unsupported" | "denied" | "off" | "on" | "loading";

// Campana de notificaciones en la cabecera del vendedor. Pide permiso de forma
// automática en el primer inicio (una vez) y, si no, al pulsarla.
export function NotificationBell() {
  const [state, setState] = useState<PushState>("loading");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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
      toast.success("Notificaciones activadas");
    } catch {
      setState("off");
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
      toast.success("Notificaciones desactivadas");
    } catch {
      setState("on");
    }
  }

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
      .then((sub) => {
        if (sub) {
          setState("on");
          return;
        }
        setState("off");
        // Primer inicio: pedir permiso automáticamente, una sola vez.
        if (
          Notification.permission === "default" &&
          !localStorage.getItem("vendi-push-asked")
        ) {
          localStorage.setItem("vendi-push-asked", "1");
          void enable();
        }
      })
      .catch(() => setState("unsupported"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  if (state === "unsupported") return null;

  function onClick() {
    if (state === "on") void disable();
    else if (state === "denied")
      toast.error("Activa las notificaciones desde los ajustes del navegador");
    else void enable();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Notificaciones"
      className="relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-secondary"
    >
      {state === "loading" ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : state === "on" ? (
        <BellRing className="size-5 text-brand" />
      ) : (
        <Bell className="size-5 text-muted-foreground" />
      )}
      {state === "on" ? (
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-green-500" />
      ) : null}
    </button>
  );
}
