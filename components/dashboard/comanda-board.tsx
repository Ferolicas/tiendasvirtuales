"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Banknote,
  Bike,
  CheckCheck,
  ChefHat,
  Clock,
  CreditCard,
  Inbox,
  MapPin,
  Phone,
  Star,
  Store as StoreIcon,
  Timer,
  Trash2,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { VendiLiveDot } from "@/components/shared/vendi-dot";
import { formatPrice } from "@/lib/format";

export interface ComandaOrder {
  id: string;
  orderNumber: number;
  storeId: string;
  storeName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  fulfillment: "delivery" | "pickup";
  deliveryAddress: string | null;
  paymentMethod: "card" | "in_store";
  totalCents: number;
  status: string;
  cancelReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  lines: { name: string; quantity: number }[];
  review: { rating: number; comment: string | null } | null;
}

interface Kpis {
  salesCents: number;
  salesCount: number;
  pendingCents: number;
  pendingCount: number;
  cancelledCents: number;
  cancelledCount: number;
}

interface TopEntry {
  name: string;
  quantity: number;
}

function elapsed(from: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function diff(from: string, to: string): string {
  return elapsed(from, new Date(to).getTime());
}

// Número con count-up al montar (KPIs «vivos»).
function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (v: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      setDisplay(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(display)}</>;
}

const INCOMING = (o: ComandaOrder) =>
  o.status === "paid" ||
  (o.status === "pending" && o.paymentMethod === "in_store");

export function ComandaBoard({
  storeIds,
  initialOrders,
  kpis,
  top,
  currency,
}: {
  storeIds: string[];
  initialOrders: ComandaOrder[];
  kpis: Kpis;
  top: { day: TopEntry[]; month: TopEntry[]; year: TopEntry[] };
  currency: string;
}) {
  const t = useTranslations("comanda");
  const tDash = useTranslations("dashboard");
  const [orders, setOrders] = useState<ComandaOrder[]>(initialOrders);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [tab, setTab] = useState<"delivered" | "cancelled" | "pending">(
    "delivered"
  );
  const [cancelTarget, setCancelTarget] = useState<ComandaOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<ComandaOrder | null>(null);
  const cancelReason = useRef("");

  // Tick del contador (1 s)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket: Socket = io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      setConnected(true);
      for (const id of storeIds) socket.emit("store:join", id);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:new", (order: ComandaOrder & { lines?: ComandaOrder["lines"] }) => {
      setOrders((prev) =>
        prev.some((o) => o.id === order.id)
          ? prev
          : [
              {
                ...order,
                lines: order.lines ?? [],
                storeName: "",
                cancelReason: null,
                deliveredAt: null,
                review: null,
              },
              ...prev,
            ]
      );
      toast.success(`#${order.orderNumber} · ${order.customerName}`);
    });
    socket.on(
      "order:update",
      (event: {
        id: string;
        status: string;
        acceptedAt?: string | null;
        readyAt?: string | null;
        deliveredAt?: string | null;
      }) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === event.id
              ? {
                  ...o,
                  status: event.status,
                  acceptedAt: event.acceptedAt ?? o.acceptedAt,
                  readyAt: event.readyAt ?? o.readyAt,
                  deliveredAt: event.deliveredAt ?? o.deliveredAt,
                }
              : o
          )
        );
      }
    );
    return () => {
      socket.disconnect();
    };
  }, [storeIds]);

  // Más antiguo PRIMERO: lleva más tiempo esperando.
  const incoming = useMemo(
    () =>
      orders
        .filter(INCOMING)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders]
  );
  const preparing = useMemo(
    () =>
      orders
        .filter((o) => o.status === "preparing")
        .sort((a, b) => (a.acceptedAt ?? "").localeCompare(b.acceptedAt ?? "")),
    [orders]
  );
  const delivering = useMemo(
    () =>
      orders
        .filter((o) => o.status === "ready")
        .sort((a, b) => (a.readyAt ?? "").localeCompare(b.readyAt ?? "")),
    [orders]
  );
  const delivered = useMemo(
    () =>
      orders
        .filter((o) => o.status === "delivered" || o.status === "shipped")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders]
  );
  const cancelled = useMemo(
    () =>
      orders
        .filter((o) => o.status === "cancelled")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders]
  );
  const pendingTab = useMemo(
    () =>
      orders
        .filter((o) => o.status === "pending" && o.paymentMethod === "card")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders]
  );

  async function transition(
    order: ComandaOrder,
    status: "preparing" | "ready" | "delivered" | "cancelled" | "archived",
    reason?: string
  ) {
    const previous = order.status;
    const optimisticStamp = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status,
              acceptedAt: status === "preparing" ? optimisticStamp : o.acceptedAt,
              readyAt: status === "ready" ? optimisticStamp : o.readyAt,
              deliveredAt:
                status === "delivered" ? optimisticStamp : o.deliveredAt,
              cancelReason: reason ?? o.cancelReason,
            }
          : o
      )
    );
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: previous } : o))
      );
      toast.error(tDash("orderUpdateFailed"));
      return;
    }
    if (status === "archived") toast.success(t("archivedToast"));
  }

  async function deleteReview(order: ComandaOrder) {
    const res = await fetch(`/api/orders/${order.id}/review`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error(tDash("orderUpdateFailed"));
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, review: null } : o))
    );
    setDetailOrder((prev) =>
      prev && prev.id === order.id ? { ...prev, review: null } : prev
    );
    toast.success(t("reviewDeleted"));
  }

  const fmtMoney = (v: number) => formatPrice(Math.round(v), currency);
  const fmtCount = (v: number) => `${Math.round(v)}`;

  const kpiCards = [
    {
      key: "delivered" as const,
      icon: Banknote,
      label: t("kpiSales"),
      hint: t("kpiSalesHint"),
      cents: kpis.salesCents,
      count: kpis.salesCount,
      tone: "text-green-600 dark:text-green-400",
    },
    {
      key: "pending" as const,
      icon: Timer,
      label: t("kpiPending"),
      hint: t("kpiPendingHint"),
      cents: kpis.pendingCents,
      count: kpis.pendingCount,
      tone: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "cancelled" as const,
      icon: XCircle,
      label: t("kpiCancelled"),
      hint: t("kpiCancelledHint"),
      cents: kpis.cancelledCents,
      count: kpis.cancelledCount,
      tone: "text-red-600 dark:text-red-400",
    },
  ];

  const topList = top[period];

  return (
    <div className="grid gap-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {connected ? (
          <VendiLiveDot />
        ) : (
          <span className="inline-block size-2 rounded-full bg-muted-foreground/30" />
        )}
        {tDash("liveConnected")}
      </div>

      {/* KPIs interactivos */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpiCards.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => setTab(kpi.key)}
            className={`hover-lift rounded-3xl border bg-card p-5 text-left shadow-soft transition-colors ${
              tab === kpi.key ? "border-primary" : ""
            }`}
          >
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              <kpi.icon className={`size-4 ${kpi.tone}`} />
              {kpi.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight">
              <AnimatedNumber value={kpi.cents} format={fmtMoney} />
            </p>
            <p className="text-xs text-muted-foreground">
              <AnimatedNumber value={kpi.count} format={fmtCount} />{" "}
              {t("ordersCount", { count: "" }).replace("  ", " ").trim()}
              {" · "}
              {kpi.hint}
            </p>
          </button>
        ))}
      </div>

      {/* Top 5 */}
      <div className="rounded-3xl border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-bold tracking-tight">
            <TrendingUp className="size-4 text-brand" />
            {t("topTitle")}
          </p>
          <div className="flex gap-1">
            {(["day", "month", "year"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  period === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {value === "day"
                  ? t("periodDay")
                  : value === "month"
                    ? t("periodMonth")
                    : t("periodYear")}
              </button>
            ))}
          </div>
        </div>
        {topList.length === 0 ? (
          <p className="mt-4 text-sm font-light text-muted-foreground">
            {t("topEmpty")}
          </p>
        ) : (
          <div className="mt-4 grid gap-2">
            {topList.map((entry, i) => {
              const max = topList[0].quantity;
              return (
                <div key={entry.name} className="flex items-center gap-3 text-sm">
                  <span className="w-4 font-extrabold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="w-36 truncate font-medium sm:w-48">
                    {entry.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${(entry.quantity / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-bold">
                    {entry.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tablero de cocina */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ComandaColumn
          title={t("colIncoming")}
          icon={Inbox}
          orders={incoming}
          now={now}
          currency={currency}
          counterFrom={(o) => o.createdAt}
          extraTimes={() => []}
          primaryAction={(o) => ({
            label: t("acceptButton"),
            icon: ChefHat,
            run: () => transition(o, "preparing"),
          })}
          onCancel={(o) => setCancelTarget(o)}
          emptyLabel={t("colEmpty")}
        />
        <ComandaColumn
          title={t("colPreparing")}
          icon={ChefHat}
          orders={preparing}
          now={now}
          currency={currency}
          counterFrom={(o) => o.acceptedAt ?? o.createdAt}
          extraTimes={(o) =>
            o.acceptedAt
              ? [t("waitedLabel", { time: diff(o.createdAt, o.acceptedAt) })]
              : []
          }
          primaryAction={(o) => ({
            label: t("readyButton"),
            icon: CheckCheck,
            run: () => transition(o, "ready"),
          })}
          onCancel={(o) => setCancelTarget(o)}
          emptyLabel={t("colEmpty")}
        />
        <ComandaColumn
          title={t("colDelivering")}
          icon={Bike}
          orders={delivering}
          now={now}
          currency={currency}
          counterFrom={(o) => o.readyAt ?? o.createdAt}
          extraTimes={(o) => {
            const times: string[] = [];
            if (o.acceptedAt)
              times.push(
                t("waitedLabel", { time: diff(o.createdAt, o.acceptedAt) })
              );
            if (o.acceptedAt && o.readyAt)
              times.push(
                t("prepLabel", { time: diff(o.acceptedAt, o.readyAt) })
              );
            return times;
          }}
          primaryAction={(o) => ({
            label: t("deliveredButton"),
            icon: CheckCheck,
            run: () => transition(o, "delivered"),
          })}
          onCancel={null}
          emptyLabel={t("colEmpty")}
        />
      </div>

      {/* Pestañas de historial */}
      <div className="grid gap-4">
        <div className="flex gap-1.5">
          {(
            [
              ["delivered", t("tabDelivered"), delivered.length],
              ["cancelled", t("tabCancelled"), cancelled.length],
              ["pending", t("tabPending"), pendingTab.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold tracking-tight transition-colors ${
                tab === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} · {count}
            </button>
          ))}
        </div>
        <div className="grid gap-1.5">
          {(tab === "delivered"
            ? delivered
            : tab === "cancelled"
              ? cancelled
              : pendingTab
          )
            .slice(0, 30)
            .map((order) => (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailOrder(order)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setDetailOrder(order);
                }}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60"
              >
                <span className="font-bold">#{order.orderNumber}</span>
                <span className="flex-1 truncate">{order.customerName}</span>
                {order.review ? (
                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                    {order.review.rating}★
                  </span>
                ) : null}
                {order.cancelReason ? (
                  <span className="max-w-44 truncate text-xs text-muted-foreground">
                    {order.cancelReason}
                  </span>
                ) : null}
                <span className="font-semibold">
                  {formatPrice(order.totalCents, currency)}
                </span>
                <StatusBadge status={order.status} />
                {tab === "pending" ? (
                  <span className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        transition(order, "archived");
                      }}
                    >
                      {t("archiveButton")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full text-xs text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelTarget(order);
                      }}
                    >
                      {t("cancelButton")}
                    </Button>
                  </span>
                ) : null}
              </div>
            ))}
        </div>
      </div>

      {/* Detalle completo de un pedido del historial */}
      <Drawer
        open={Boolean(detailOrder)}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
      >
        <DrawerContent className="max-h-[92dvh]">
          {detailOrder ? (
            <div className="mx-auto w-full max-w-md overflow-y-auto pb-8">
              <DrawerHeader>
                <DrawerTitle className="flex items-center justify-between gap-3 tracking-tight">
                  {t("detailTitle")} · #{detailOrder.orderNumber}
                  <StatusBadge status={detailOrder.status} />
                </DrawerTitle>
              </DrawerHeader>
              <div className="grid gap-4 px-4 text-sm">
                <div className="grid gap-1.5 rounded-2xl bg-secondary/60 p-4">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("enteredAt")}
                    </span>
                    <span className="font-medium">
                      {new Date(detailOrder.createdAt).toLocaleString()}
                    </span>
                  </p>
                  {detailOrder.acceptedAt ? (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("phaseWaitLabel")}
                      </span>
                      <span className="font-mono font-bold">
                        {diff(detailOrder.createdAt, detailOrder.acceptedAt)}
                      </span>
                    </p>
                  ) : null}
                  {detailOrder.acceptedAt && detailOrder.readyAt ? (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("phaseKitchenLabel")}
                      </span>
                      <span className="font-mono font-bold">
                        {diff(detailOrder.acceptedAt, detailOrder.readyAt)}
                      </span>
                    </p>
                  ) : null}
                  {detailOrder.readyAt && detailOrder.deliveredAt ? (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("phaseDeliveryLabel")}
                      </span>
                      <span className="font-mono font-bold">
                        {diff(detailOrder.readyAt, detailOrder.deliveredAt)}
                      </span>
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="gap-1 rounded-full">
                    {detailOrder.fulfillment === "pickup" ? (
                      <StoreIcon className="size-3" />
                    ) : (
                      <Bike className="size-3" />
                    )}
                    {detailOrder.fulfillment === "pickup"
                      ? t("pickupBadge")
                      : t("deliveryBadge")}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 rounded-full">
                    {detailOrder.paymentMethod === "card" ? (
                      <CreditCard className="size-3" />
                    ) : (
                      <Wallet className="size-3" />
                    )}
                    {detailOrder.paymentMethod === "card"
                      ? t("payCardBadge")
                      : detailOrder.fulfillment === "pickup"
                        ? t("payInStoreBadge")
                        : t("payCashBadge")}
                  </Badge>
                  <span className="ml-auto text-base font-extrabold">
                    {formatPrice(detailOrder.totalCents, currency)}
                  </span>
                </div>

                <div className="grid gap-0.5 border-y py-2">
                  {detailOrder.lines.map((line, i) => (
                    <p key={i}>
                      <span className="font-bold">{line.quantity}×</span>{" "}
                      {line.name}
                    </p>
                  ))}
                </div>

                <div className="grid gap-1 rounded-2xl bg-secondary/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("detailCustomer")}
                  </p>
                  <p className="font-medium">{detailOrder.customerName}</p>
                  <p className="text-muted-foreground">
                    {detailOrder.customerEmail}
                  </p>
                  {detailOrder.customerPhone ? (
                    <a
                      href={`tel:${detailOrder.customerPhone}`}
                      className="flex w-fit items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3" />
                      {detailOrder.customerPhone}
                    </a>
                  ) : null}
                  {detailOrder.deliveryAddress ? (
                    <p className="flex items-start gap-1 text-muted-foreground">
                      <MapPin className="mt-0.5 size-3 shrink-0" />
                      {detailOrder.deliveryAddress}
                    </p>
                  ) : null}
                </div>

                {detailOrder.cancelReason ? (
                  <div className="grid gap-1 rounded-2xl bg-red-500/10 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-red-700 dark:text-red-300">
                      {t("detailReason")}
                    </p>
                    <p>{detailOrder.cancelReason}</p>
                  </div>
                ) : null}

                {detailOrder.review ? (
                  <div className="grid gap-1.5 rounded-2xl bg-amber-500/10 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      {t("reviewTitle")}
                    </p>
                    <p className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          className={`size-4 ${
                            value <= (detailOrder.review?.rating ?? 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {detailOrder.customerName}
                      </span>
                    </p>
                    {detailOrder.review.comment ? (
                      <p className="font-light">
                        “{detailOrder.review.comment}”
                      </p>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 w-fit rounded-full text-destructive"
                      onClick={() => deleteReview(detailOrder)}
                    >
                      <Trash2 className="size-3.5" />
                      {t("deleteReview")}
                    </Button>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  {t("storeLabel")}: {detailOrder.storeName}
                </p>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      {/* Motivo de cancelación */}
      <AlertDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("cancelReasonTitle", {
                number: cancelTarget?.orderNumber ?? 0,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="pt-2">
                <Input
                  placeholder={t("cancelReasonPlaceholder")}
                  onChange={(e) => {
                    cancelReason.current = e.target.value;
                  }}
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setCancelTarget(null)}
            >
              {t("cancelKeep")}
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => {
                if (cancelTarget && cancelReason.current.trim().length >= 3) {
                  transition(
                    cancelTarget,
                    "cancelled",
                    cancelReason.current.trim()
                  );
                  setCancelTarget(null);
                  cancelReason.current = "";
                }
              }}
            >
              {t("cancelConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Columna de comanda ───────────────────────────────────────────────────
function ComandaColumn({
  title,
  icon: Icon,
  orders,
  now,
  currency,
  counterFrom,
  extraTimes,
  primaryAction,
  onCancel,
  emptyLabel,
}: {
  title: string;
  icon: typeof Inbox;
  orders: ComandaOrder[];
  now: number;
  currency: string;
  counterFrom: (o: ComandaOrder) => string;
  extraTimes: (o: ComandaOrder) => string[];
  primaryAction: (o: ComandaOrder) => {
    label: string;
    icon: typeof Inbox;
    run: () => void;
  };
  onCancel: ((o: ComandaOrder) => void) | null;
  emptyLabel: string;
}) {
  const t = useTranslations("comanda");

  return (
    <div className="grid content-start gap-3 rounded-3xl border bg-secondary/30 p-4">
      <p className="flex items-center justify-between font-bold tracking-tight">
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-brand" />
          {title}
        </span>
        <Badge variant="secondary" className="rounded-full">
          {orders.length}
        </Badge>
      </p>

      {orders.length === 0 ? (
        <p className="py-6 text-center text-sm font-light text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        orders.map((order) => {
          const action = primaryAction(order);
          return (
            <div
              key={order.id}
              className="animate-fade-up grid gap-2.5 rounded-2xl border bg-card p-4 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold tracking-tight">
                  #{order.orderNumber}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 font-mono text-sm font-bold text-accent-foreground">
                  <Clock className="size-3.5" />
                  {elapsed(counterFrom(order), now)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleTimeString()} ·{" "}
                {order.storeName}
              </p>

              {extraTimes(order).length > 0 ? (
                <p className="flex flex-wrap gap-x-3 text-[11px] font-medium text-muted-foreground">
                  {extraTimes(order).map((time) => (
                    <span key={time}>{time}</span>
                  ))}
                </p>
              ) : null}

              <div className="grid gap-0.5 border-y py-2 text-sm">
                {order.lines.map((line, i) => (
                  <p key={i}>
                    <span className="font-bold">{line.quantity}×</span>{" "}
                    {line.name}
                  </p>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="secondary" className="gap-1 rounded-full">
                  {order.fulfillment === "pickup" ? (
                    <StoreIcon className="size-3" />
                  ) : (
                    <Bike className="size-3" />
                  )}
                  {order.fulfillment === "pickup"
                    ? t("pickupBadge")
                    : t("deliveryBadge")}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`gap-1 rounded-full ${
                    order.paymentMethod === "in_store" &&
                    order.status === "pending"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : ""
                  }`}
                >
                  {order.paymentMethod === "card" ? (
                    <CreditCard className="size-3" />
                  ) : (
                    <Wallet className="size-3" />
                  )}
                  {order.paymentMethod === "card"
                    ? t("payCardBadge")
                    : order.status === "pending"
                      ? t("cashPendingBadge")
                      : order.fulfillment === "pickup"
                        ? t("payInStoreBadge")
                        : t("payCashBadge")}
                </Badge>
                <span className="ml-auto font-extrabold">
                  {formatPrice(order.totalCents, currency)}
                </span>
              </div>

              <div className="grid gap-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  {order.customerName}
                  {order.customerPhone ? (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="ml-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="size-3" />
                      {order.customerPhone}
                    </a>
                  ) : null}
                </p>
                {order.deliveryAddress ? (
                  <p className="flex items-start gap-1">
                    <MapPin className="mt-0.5 size-3 shrink-0" />
                    {order.deliveryAddress}
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={action.run}
                  className="flex-1 rounded-full"
                >
                  <action.icon className="size-3.5" />
                  {action.label}
                </Button>
                {onCancel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCancel(order)}
                    className="rounded-full text-destructive"
                  >
                    <XCircle className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
