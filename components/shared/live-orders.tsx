"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
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
  const [orders, setOrders] = useState<LiveOrder[]>(initialOrders);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io({ transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("store:join", storeId);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:new", (order: LiveOrder) => {
      setOrders((prev) => [order, ...prev].slice(0, 20));
    });

    return () => {
      socket.disconnect();
    };
  }, [storeId]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={`inline-block size-2 rounded-full ${
            connected ? "animate-pulse bg-green-500" : "bg-zinc-300"
          }`}
        />
        {connected ? t("liveConnected") : t("liveConnecting")}
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="animate-fade-in flex items-center justify-between border-b pb-2 text-sm last:border-0"
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
              <Badge variant="secondary" className="rounded-full">
                {order.status}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
