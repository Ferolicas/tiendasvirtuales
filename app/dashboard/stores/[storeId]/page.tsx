import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, products, stores } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddProductForm } from "@/components/shared/add-product-form";
import { LiveOrders } from "@/components/shared/live-orders";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Gestionar tienda" };

export default async function StoreAdminPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { storeId } = await params;
  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.ownerId, session.user.id)))
    .limit(1);
  if (!store) notFound();

  const [productList, recentOrders] = await Promise.all([
    db
      .select()
      .from(products)
      .where(eq(products.storeId, store.id))
      .orderBy(desc(products.createdAt)),
    db
      .select()
      .from(orders)
      .where(eq(orders.storeId, store.id))
      .orderBy(desc(orders.createdAt))
      .limit(20),
  ]);

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {store.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            tienda pública:{" "}
            <Link href={`/s/${store.slug}`} className="underline" target="_blank">
              /s/{store.slug}
            </Link>
          </p>
        </div>
        <Badge variant={store.plan === "pro" ? "default" : "secondary"}>
          plan {store.plan}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos en tiempo real</CardTitle>
            <CardDescription>
              Los pedidos nuevos aparecen aquí al instante.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveOrders
              storeId={store.id}
              currency={store.currency}
              initialOrders={recentOrders.map((order) => ({
                id: order.id,
                customerName: order.customerName,
                totalCents: order.totalCents,
                status: order.status,
                createdAt: order.createdAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Añadir producto</CardTitle>
            </CardHeader>
            <CardContent>
              <AddProductForm storeId={store.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos ({productList.length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {productList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay productos.
                </p>
              ) : (
                productList.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                  >
                    <span>{product.name}</span>
                    <span className="font-medium">
                      {formatPrice(product.priceCents, store.currency)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Button variant="outline" className="w-fit" asChild>
        <Link href="/dashboard">← Volver al panel</Link>
      </Button>
    </div>
  );
}
