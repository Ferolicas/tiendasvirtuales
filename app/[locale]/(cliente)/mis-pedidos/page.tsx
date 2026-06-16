import { desc, eq } from "drizzle-orm";
import { Package } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, stores } from "@/lib/db/schema";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderMiniTracker } from "@/components/store/order-mini-tracker";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

// Etiqueta y color por estado del pedido (visión del comprador).
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "Pendiente de pago",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  paid: {
    label: "Pagado",
    cls: "bg-green-600/12 text-green-700 dark:text-green-300",
  },
  preparing: {
    label: "En preparación",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  ready: {
    label: "En camino / listo",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  delivered: { label: "Entregado", cls: "bg-secondary text-foreground" },
  shipped: { label: "Entregado", cls: "bg-secondary text-foreground" },
  cancelled: { label: "Cancelado", cls: "bg-destructive/10 text-destructive" },
  archived: { label: "Descartado", cls: "bg-secondary text-muted-foreground" },
};

export default async function MisPedidosPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      storeName: stores.name,
      storeSlug: stores.slug,
      currency: stores.currency,
    })
    .from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(orders.customerEmail, email))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Mis pedidos</h1>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aún no tienes pedidos"
          hint="Explora las tiendas y haz tu primera compra."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((o) => {
            const s = STATUS[o.status] ?? {
              label: o.status,
              cls: "bg-secondary",
            };
            return (
              <div
                key={o.id}
                className="grid gap-3 rounded-3xl border bg-card p-5 shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold tracking-tight">
                        {o.storeName}
                      </p>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 rounded-full ${s.cls}`}
                      >
                        {s.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pedido #{o.orderNumber} ·{" "}
                      {formatPrice(o.totalCents, o.currency)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {o.status === "pending" ? (
                      <Button asChild size="sm" className="rounded-full">
                        <Link href={`/s/${o.storeSlug}`}>Pagar</Link>
                      </Button>
                    ) : null}
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      <Link href={`/o/${o.id}`}>Ver</Link>
                    </Button>
                  </div>
                </div>
                {["paid", "preparing", "ready"].includes(o.status) ? (
                  <OrderMiniTracker orderId={o.id} initialStatus={o.status} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
