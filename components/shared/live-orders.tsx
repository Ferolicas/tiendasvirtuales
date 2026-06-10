"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
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
          className={`inline-block h-2 w-2 rounded-full ${
            connected ? "bg-green-500" : "bg-zinc-300"
          }`}
        />
        {connected ? "Conectado en directo" : "Conectando…"}
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay pedidos. Comparte tu tienda para empezar a vender.
        </p>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
          >
            <div>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleString("es-ES")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {formatPrice(order.totalCents, currency)}
              </span>
              <Badge variant="secondary">{order.status}</Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
