import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { orders, reviews, stores } from "@/lib/db/schema";
import { TrackOrder } from "@/components/store/track-order";
import { verticalFor } from "@/lib/verticals";

export const metadata = { title: "Seguimiento · Tracking" };

// Página pública de seguimiento: el uuid del pedido (solo lo conoce el
// comprador) es la credencial de acceso.
export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();
  const t = await getTranslations("tracking");

  const [row] = await db
    .select({ order: orders, store: stores })
    .from(orders)
    .innerJoin(stores, eq(orders.storeId, stores.id))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row) notFound();

  const [existingReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.orderId, orderId))
    .limit(1);

  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link
            href={`/s/${row.store.slug}`}
            className="text-lg font-extrabold tracking-tight"
          >
            {row.store.name}
          </Link>
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
            {t("orderNumber", { number: row.order.orderNumber })}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 py-14 sm:px-6">
        <TrackOrder
          order={{
            id: row.order.id,
            orderNumber: row.order.orderNumber,
            status: row.order.status,
            fulfillment: row.order.fulfillment,
            customerName: row.order.customerName,
            hasReview: Boolean(existingReview),
          }}
          storeName={row.store.name}
          storePhone={row.store.phone}
          vertical={verticalFor(row.store.storeCategory)}
        />
      </section>
    </main>
  );
}
