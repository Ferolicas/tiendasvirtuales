"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Bike, CheckCheck, Package, Receipt } from "lucide-react";
import { motion } from "motion/react";

// Versión minimizada del seguimiento, embebida en la tarjeta de «Mis pedidos»:
// el comprador ve la etapa en vivo (socket) con la animación, sin salir.
const STEPS = ["paid", "preparing", "ready", "delivered"] as const;
const LABEL: Record<string, string> = {
  paid: "Pago confirmado",
  preparing: "En preparación",
  ready: "En camino / listo",
  delivered: "Entregado",
};

export function OrderMiniTracker({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const socket: Socket = io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => socket.emit("order:join", orderId));
    socket.on("order:update", ({ status: next }: { status: string }) =>
      setStatus(next)
    );
    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const normalized = status === "shipped" ? "delivered" : status;
  const idx = STEPS.indexOf(normalized as (typeof STEPS)[number]);
  if (idx < 0) return null;

  return (
    <div className="rounded-2xl bg-secondary/50 p-3">
      <p className="mb-2.5 text-xs font-bold tracking-tight">
        {LABEL[normalized]}
      </p>
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const Icon =
            i === 0 ? Receipt : i === 1 ? Package : i === 2 ? Bike : CheckCheck;
          const done = i <= idx;
          const active = i === idx;
          return (
            <div key={step} className="flex flex-1 items-center gap-1">
              <motion.div
                animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={
                  active ? { duration: 1.4, repeat: Infinity } : { duration: 0 }
                }
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-brand text-brand-foreground"
                    : "bg-background text-muted-foreground"
                }`}
              >
                <Icon className="size-3.5" />
              </motion.div>
              {i < STEPS.length - 1 ? (
                <div
                  className={`h-0.5 flex-1 rounded-full ${
                    i < idx ? "bg-brand" : "bg-background"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
