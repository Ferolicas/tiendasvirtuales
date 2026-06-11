"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { CheckCircle2, Inbox, Loader2, Search, Truck, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { VendiLiveDot, VendiLoader } from "@/components/shared/vendi-dot";
import { formatPrice } from "@/lib/format";

export interface PanelOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  status: string;
  createdAt: string;
}

interface OrderItemDetail {
  id: string;
  quantity: number;
  unitPriceCents: number;
  productName: string;
}

const FILTERS = ["all", "pending", "paid", "shipped", "cancelled"] as const;

export function OrdersPanel({
  storeId,
  currency,
  initialOrders,
  initialHasMore,
}: {
  storeId: string;
  currency: string;
  initialOrders: PanelOrder[];
  initialHasMore: boolean;
}) {
  const t = useTranslations("dashboard");
  const tStatus = useTranslations("status");
  const tToast = useTranslations("toasts");
  const tEmpty = useTranslations("empty");

  const [orders, setOrders] = useState<PanelOrder[]>(initialOrders);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<PanelOrder | null>(null);
  const [detail, setDetail] = useState<OrderItemDetail[] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [updating, setUpdating] = useState(false);
  const liveIds = useRef(new Set<string>());

  useEffect(() => {
    const socket: Socket = io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("store:join", storeId);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:new", (order: PanelOrder) => {
      liveIds.current.add(order.id);
      setOrders((prev) => [order, ...prev]);
      toast.success(
        tToast("newOrder", {
          name: order.customerName,
          total: formatPrice(order.totalCents, currency),
        })
      );
    });
    socket.on(
      "order:update",
      ({ id, status }: { id: string; status: string }) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o))
        );
        setSelected((prev) =>
          prev && prev.id === id ? { ...prev, status } : prev
        );
      }
    );
    return () => {
      socket.disconnect();
    };
  }, [storeId, currency, tToast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false;
      if (!q) return true;
      return (
        order.customerName.toLowerCase().includes(q) ||
        order.customerEmail.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, query]);

  async function openDetail(order: PanelOrder) {
    setSelected(order);
    setDetail(null);
    const res = await fetch(`/api/orders/${order.id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data.items);
    } else {
      setDetail([]);
    }
  }

  async function transition(
    status: "paid" | "shipped" | "cancelled",
    reason?: string
  ) {
    if (!selected) return;
    setUpdating(true);
    const previous = selected.status;
    // Optimista: el estado cambia ya en lista y drawer.
    setOrders((prev) =>
      prev.map((o) => (o.id === selected.id ? { ...o, status } : o))
    );
    setSelected((prev) => (prev ? { ...prev, status } : prev));

    const res = await fetch(`/api/orders/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    setUpdating(false);
    if (!res.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selected.id ? { ...o, status: previous } : o
        )
      );
      setSelected((prev) => (prev ? { ...prev, status: previous } : prev));
      toast.error(t("orderUpdateFailed"));
      return;
    }
    toast.success(t("orderUpdated"));
  }

  async function loadMore() {
    setLoadingMore(true);
    const oldest = orders[orders.length - 1];
    const res = await fetch(
      `/api/stores/${storeId}/orders?before=${encodeURIComponent(
        oldest?.createdAt ?? new Date().toISOString()
      )}`
    );
    setLoadingMore(false);
    if (!res.ok) return;
    const data = await res.json();
    const incoming: PanelOrder[] = data.orders.map(
      (o: PanelOrder & { createdAt: string }) => ({
        ...o,
        createdAt: o.createdAt,
      })
    );
    setOrders((prev) => {
      const known = new Set(prev.map((o) => o.id));
      return [...prev, ...incoming.filter((o) => !known.has(o.id))];
    });
    setHasMore(data.hasMore);
  }

  // Interino V2: las transiciones de cocina viven en la comanda (V2-4);
  // aquí solo cobro manual y cancelación.
  const canMarkPaid = selected?.status === "pending";
  const canMarkShipped = false;
  const canCancel =
    selected?.status === "pending" || selected?.status === "paid";

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {connected ? (
          <VendiLiveDot />
        ) : (
          <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
        )}
        {connected ? t("liveConnected") : t("liveConnecting")}
      </div>

      {/* Controles: búsqueda + filtro por estado */}
      <div className="grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "all" ? t("filterAll") : tStatus(value)}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tEmpty("ordersTitle")}
          hint={tEmpty("ordersHint")}
        />
      ) : (
        <div className="grid gap-1.5">
          {visible.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => openDetail(order)}
              className={`flex items-center justify-between rounded-xl border border-transparent px-2 py-2 text-left text-sm transition-colors hover:border-border hover:bg-secondary/60 ${
                liveIds.current.has(order.id) ? "animate-fade-up bg-accent/50" : ""
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
            </button>
          ))}
        </div>
      )}

      {hasMore ? (
        <Button
          variant="outline"
          size="sm"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-fit rounded-full"
        >
          {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {t("loadMore")}
        </Button>
      ) : null}

      {/* Drawer de detalle */}
      <Drawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DrawerContent>
          {selected ? (
            <div className="mx-auto w-full max-w-md pb-8">
              <DrawerHeader>
                <DrawerTitle className="flex items-center justify-between gap-3">
                  {t("orderDetail")}
                  <StatusBadge status={selected.status} />
                </DrawerTitle>
                <DrawerDescription>
                  {new Date(selected.createdAt).toLocaleString()}
                </DrawerDescription>
              </DrawerHeader>
              <div className="grid gap-4 px-4">
                <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("customer")}
                  </p>
                  <p className="mt-1 font-medium">{selected.customerName}</p>
                  <p className="text-muted-foreground">
                    {selected.customerEmail}
                  </p>
                </div>

                <div className="grid gap-2 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("items")}
                  </p>
                  {detail === null ? (
                    <div className="py-4">
                      <VendiLoader />
                    </div>
                  ) : (
                    detail.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b pb-1.5 last:border-0"
                      >
                        <span>
                          {item.quantity} × {item.productName}
                        </span>
                        <span className="font-medium">
                          {formatPrice(
                            item.unitPriceCents * item.quantity,
                            currency
                          )}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="flex items-center justify-between pt-1 font-bold">
                    <span>{t("orderTotal")}</span>
                    <span>{formatPrice(selected.totalCents, currency)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {canMarkPaid ? (
                    <Button
                      size="sm"
                      onClick={() => transition("paid")}
                      disabled={updating}
                      className="rounded-full"
                    >
                      <CheckCircle2 className="size-3.5" />
                      {t("markPaid")}
                    </Button>
                  ) : null}
                  {canMarkShipped ? (
                    <Button
                      size="sm"
                      onClick={() => transition("shipped")}
                      disabled={updating}
                      className="rounded-full"
                    >
                      <Truck className="size-3.5" />
                      {t("markShipped")}
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmCancel(true)}
                      disabled={updating}
                      className="rounded-full"
                    >
                      <XCircle className="size-3.5" />
                      {t("cancelOrder")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      {/* Confirmación de cancelación */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cancelText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              {t("keepOrder")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={() => transition("cancelled", "Cancelado por la tienda")}
            >
              {t("confirmCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
