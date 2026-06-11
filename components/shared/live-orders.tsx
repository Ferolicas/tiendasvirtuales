"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { VendiLiveDot } from "@/components/shared/vendi-dot";
import { formatPrice } from "@/lib/format";

export interface LiveOrder {
  id: string;
  customerName: string;
  totalCents: number;
  status: string;
  createdAt: string;
}

export function LiveOrders({
  storeId,
  currency,
  initialOrders,
}: {
  storeId: string;
  currency: string;
  initialOrders: LiveOrder[];
}) {
  const t = useTranslations("dashboard");
  const tToast = useTranslations("toasts");
  const tEmpty = useTranslations("empty");
  const [orders, setOrders] = useState<LiveOrder[]>(initialOrders);
  const [connected, setConnected] = useState(false);
  // ids llegados en vivo: se destacan con un flash de acento al entrar
  const liveIds = useRef(new Set<string>());

  useEffect(() => {
    const socket: Socket = io({ transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("store:join", storeId);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:new", (order: LiveOrder) => {
      liveIds.current.add(order.id);
      setOrders((prev) => [order, ...prev].slice(0, 20));
      toast.success(
        tToast("newOrder", {
          name: order.customerName,
          total: formatPrice(order.totalCents, currency),
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [storeId, currency, tToast]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {connected ? (
          <VendiLiveDot />
        ) : (
          <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
        )}
        {connected ? t("liveConnected") : t("liveConnecting")}
      </div>
      {orders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tEmpty("ordersTitle")}
          hint={tEmpty("ordersHint")}
        />
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className={`flex items-center justify-between border-b pb-2 text-sm last:border-0 ${
              liveIds.current.has(order.id)
                ? "animate-fade-up rounded-xl bg-accent/60 px-2 py-1.5"
                : ""
            }`}
          >
            <div>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {formatPrice(order.totalCents, currency)}
              </span>
              <StatusBadge status={order.status} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
