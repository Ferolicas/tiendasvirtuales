import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orderItems, orders, products, stores } from "@/lib/db/schema";
import {
  ComandaBoard,
  type ComandaOrder,
} from "@/components/dashboard/comanda-board";

export async function generateMetadata() {
  const t = await getTranslations("comanda");
  return { title: t("masterOrders") };
}

// Condición de «cobrado»: tarjeta pagada en adelante, o pagar-en-tienda
// ya entregado (se cobra al recoger).
const COLLECTED = sql`(
  (${orders.paymentMethod} = 'card' AND ${orders.status} IN ('paid','preparing','ready','delivered','shipped'))
  OR (${orders.paymentMethod} = 'in_store' AND ${orders.status} IN ('delivered','shipped'))
)`;

export default async function OrdersDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ownStores = await db
    .select({ id: stores.id, name: stores.name })
    .from(stores)
    .where(
      and(eq(stores.ownerId, session.user.id), sql`${stores.deletedAt} IS NULL`)
    );
  const storeIds = ownStores.map((s) => s.id);

  if (storeIds.length === 0) {
    redirect("/dashboard");
  }

  const inStores = inArray(orders.storeId, storeIds);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [kpis] = await db
    .select({
      salesCents: sql<number>`COALESCE(SUM(${orders.totalCents}) FILTER (WHERE ${COLLECTED}), 0)`,
      salesCount: sql<number>`COUNT(*) FILTER (WHERE ${COLLECTED})`,
      pendingCents: sql<number>`COALESCE(SUM(${orders.totalCents}) FILTER (WHERE ${orders.status} = 'pending' AND ${orders.paymentMethod} = 'card'), 0)`,
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'pending' AND ${orders.paymentMethod} = 'card')`,
      cancelledCents: sql<number>`COALESCE(SUM(${orders.totalCents}) FILTER (WHERE ${orders.status} = 'cancelled'), 0)`,
      cancelledCount: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'cancelled')`,
    })
    .from(orders)
    .where(inStores);

  async function topProducts(since: Date) {
    return db
      .select({
        name: products.name,
        quantity: sql<number>`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(
        and(
          inStores,
          inArray(orders.status, ["delivered", "shipped"]),
          gte(orders.deliveredAt, since)
        )
      )
      .groupBy(products.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(5);
  }

  const [topDay, topMonth, topYear] = await Promise.all([
    topProducts(dayStart),
    topProducts(monthStart),
    topProducts(yearStart),
  ]);

  // Pedidos relevantes: activos + colas recientes de cada pestaña.
  const recent = await db
    .select()
    .from(orders)
    .where(inStores)
    .orderBy(desc(orders.createdAt))
    .limit(120);

  const lineRows = recent.length
    ? await db
        .select({
          orderId: orderItems.orderId,
          name: products.name,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          inArray(
            orderItems.orderId,
            recent.map((o) => o.id)
          )
        )
    : [];
  const linesByOrder = new Map<string, { name: string; quantity: number }[]>();
  for (const line of lineRows) {
    linesByOrder.set(line.orderId, [
      ...(linesByOrder.get(line.orderId) ?? []),
      { name: line.name, quantity: line.quantity },
    ]);
  }

  const storeNameById = new Map(ownStores.map((s) => [s.id, s.name]));
  const initialOrders: ComandaOrder[] = recent.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    storeId: order.storeId,
    storeName: storeNameById.get(order.storeId) ?? "",
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod,
    totalCents: order.totalCents,
    status: order.status,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    lines: linesByOrder.get(order.id) ?? [],
  }));

  return (
    <ComandaBoard
      storeIds={storeIds}
      initialOrders={initialOrders}
      kpis={{
        salesCents: Number(kpis.salesCents),
        salesCount: Number(kpis.salesCount),
        pendingCents: Number(kpis.pendingCents),
        pendingCount: Number(kpis.pendingCount),
        cancelledCents: Number(kpis.cancelledCents),
        cancelledCount: Number(kpis.cancelledCount),
      }}
      top={{
        day: topDay.map((r) => ({ name: r.name, quantity: Number(r.quantity) })),
        month: topMonth.map((r) => ({ name: r.name, quantity: Number(r.quantity) })),
        year: topYear.map((r) => ({ name: r.name, quantity: Number(r.quantity) })),
      }}
      currency="EUR"
    />
  );
}
