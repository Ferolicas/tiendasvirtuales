"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Bike,
  CheckCheck,
  ChefHat,
  Clock,
  PackageCheck,
  Phone,
  Receipt,
  Star,
  XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VendiLiveDot } from "@/components/shared/vendi-dot";

interface TrackedOrder {
  id: string;
  orderNumber: number;
  status: string;
  fulfillment: "delivery" | "pickup";
  customerName: string;
  hasReview: boolean;
}

const STEPS = ["paid", "preparing", "ready", "delivered"] as const;

// Animación infinita característica de cada fase (estilo Burger King):
// la escena se repite en bucle mientras el pedido esté en esa fase.
function PhaseAnimation({ status }: { status: string }) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Icon =
      status === "preparing" ? ChefHat : status === "ready" ? Bike : Clock;
    return <Icon className="size-12 text-brand" />;
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-3 rounded-full bg-brand"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </div>
    );
  }

  if (status === "paid") {
    return (
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-20 items-center justify-center rounded-3xl bg-accent"
      >
        <Receipt className="size-9 text-accent-foreground" />
      </motion.div>
    );
  }

  if (status === "preparing") {
    return (
      <div className="relative flex size-20 items-center justify-center rounded-3xl bg-accent">
        <motion.div
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChefHat className="size-9 text-accent-foreground" />
        </motion.div>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute bottom-2 size-1 rounded-full bg-brand"
            style={{ left: `${30 + i * 15}%` }}
            animate={{ y: [-2, -14], opacity: [0.9, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.35 }}
          />
        ))}
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="relative h-20 w-44 overflow-hidden rounded-3xl bg-accent">
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          animate={{ x: [-36, 176] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bike className="size-9 text-accent-foreground" />
        </motion.div>
        <motion.div
          className="absolute bottom-3 left-0 h-0.5 w-full bg-brand/30"
          animate={{ x: ["0%", "-30%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (status === "delivered" || status === "shipped") {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="flex size-20 items-center justify-center rounded-3xl bg-green-600/15"
      >
        <PackageCheck className="size-9 text-green-600 dark:text-green-400" />
      </motion.div>
    );
  }

  return <XCircle className="size-12 text-destructive" />;
}

export function TrackOrder({
  order,
  storeName,
  storePhone,
}: {
  order: TrackedOrder;
  storeName: string;
  storePhone: string | null;
}) {
  const t = useTranslations("tracking");
  const [status, setStatus] = useState(order.status);
  const [connected, setConnected] = useState(false);
  const [reviewed, setReviewed] = useState(order.hasReview);
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const socket: Socket = io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("order:join", order.id);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:update", ({ status: next }: { status: string }) => {
      setStatus(next);
    });
    return () => {
      socket.disconnect();
    };
  }, [order.id]);

  const normalized = status === "shipped" ? "delivered" : status;
  const stepIndex = STEPS.indexOf(normalized as (typeof STEPS)[number]);

  const message =
    normalized === "pending"
      ? t("msgPending")
      : normalized === "paid"
        ? t("msgReceived")
        : normalized === "preparing"
          ? t("msgPreparing")
          : normalized === "ready"
            ? order.fulfillment === "pickup"
              ? t("msgReadyPickup")
              : t("msgReady")
            : normalized === "delivered"
              ? t("msgDelivered")
              : t("msgCancelled");

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) return;
    setSending(true);
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/orders/${order.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        comment: String(form.get("comment") ?? "") || undefined,
      }),
    });
    setSending(false);
    if (res.ok || res.status === 409) {
      setReviewed(true);
      toast.success(t("rateThanks", { name: order.customerName }));
    }
  }

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {connected ? (
          <VendiLiveDot />
        ) : (
          <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
        )}
        {t("liveLabel")}
      </div>

      <div className="flex flex-col items-center gap-5">
        <PhaseAnimation status={normalized} />
        <p className="max-w-sm text-center text-lg font-bold tracking-tight">
          {message}
        </p>
      </div>

      {/* Stepper de fases */}
      {normalized !== "cancelled" ? (
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  i <= stepIndex
                    ? "bg-brand text-brand-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {i === 0 ? (
                  <Receipt className="size-3.5" />
                ) : i === 1 ? (
                  <ChefHat className="size-3.5" />
                ) : i === 2 ? (
                  <Bike className="size-3.5" />
                ) : (
                  <CheckCheck className="size-3.5" />
                )}
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={`h-0.5 w-8 rounded-full ${
                    i < stepIndex ? "bg-brand" : "bg-secondary"
                  }`}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {storePhone ? (
        <Button variant="outline" asChild className="mx-auto rounded-full">
          <a href={`tel:${storePhone}`}>
            <Phone className="size-4" />
            {t("callStore")} · {storePhone}
          </a>
        </Button>
      ) : null}

      {/* Valoración al entregar */}
      {normalized === "delivered" && !reviewed ? (
        <form
          method="post"
          onSubmit={submitReview}
          className="animate-fade-up mx-auto grid w-full max-w-sm gap-4 rounded-3xl border bg-card p-6 text-center shadow-soft"
        >
          <p className="font-bold tracking-tight">{t("rateTitle")}</p>
          <p className="text-xs font-light text-muted-foreground">
            {t("rateHint", { storeName })}
          </p>
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value}`}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`size-7 ${
                    value <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <Input name="comment" placeholder={t("commentPlaceholder")} />
          <Button
            type="submit"
            disabled={rating === 0 || sending}
            className="rounded-full"
          >
            {t("rateButton")}
          </Button>
        </form>
      ) : null}
      {normalized === "delivered" && reviewed ? (
        <p className="animate-fade-in text-center text-sm font-medium text-green-600 dark:text-green-400">
          {t("rateThanks", { name: order.customerName })}
        </p>
      ) : null}
    </div>
  );
}
