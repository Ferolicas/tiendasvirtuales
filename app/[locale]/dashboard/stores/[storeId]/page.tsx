import { notFound, redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orders, products, stores, users } from "@/lib/db/schema";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrdersPanel } from "@/components/shared/orders-panel";
import { ProductsPanel } from "@/components/shared/products-panel";
import {
  ConnectButton,
  DomainCard,
  LegalForm,
  LogoForm,
  ShippingForm,
} from "@/components/shared/store-settings";

export default async function StoreAdminPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("dashboard");

  const { storeId } = await params;
  const [store] = await db
    .select()
    .from(stores)
    .where(
      and(
        eq(stores.id, storeId),
        eq(stores.ownerId, session.user.id),
        isNull(stores.deletedAt)
      )
    )
    .limit(1);
  if (!store) notFound();

  const [productList, recentOrders, [me]] = await Promise.all([
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
    db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
  ]);
  const plan = me?.plan ?? "free";

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("publicStore")}{" "}
            <Link
              href={`/s/${store.slug}`}
              className="underline"
              target="_blank"
            >
              /s/{store.slug}
            </Link>
          </p>
        </div>
        <Badge
          className="rounded-full"
          variant={plan === "pro" ? "default" : "secondary"}
        >
          {t("plan")} {plan}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl shadow-soft">
          <CardHeader>
            <CardTitle className="tracking-tight">
              {t("liveOrdersTitle")}
            </CardTitle>
            <CardDescription>{t("liveOrdersSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersPanel
              storeId={store.id}
              currency={store.currency}
              initialHasMore={recentOrders.length === 20}
              initialOrders={recentOrders.map((order) => ({
                id: order.id,
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                totalCents: order.totalCents,
                status: order.status,
                createdAt: order.createdAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="tracking-tight">
                {t("addProductTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductsPanel
                storeId={store.id}
                currency={store.currency}
                initialProducts={productList.map((product) => ({
                  id: product.id,
                  name: product.name,
                  description: product.description,
                  priceCents: product.priceCents,
                  stock: product.stock,
                  active: product.active,
                  imageUrl: product.imageUrl,
                }))}
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="tracking-tight">
                {t("logoTitle")}
              </CardTitle>
              <CardDescription>{t("logoText")}</CardDescription>
            </CardHeader>
            <CardContent>
              <LogoForm storeId={store.id} initialLogoUrl={store.logoUrl} />
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="tracking-tight">
                {t("domainTitle")}
              </CardTitle>
              <CardDescription>{t("domainText")}</CardDescription>
            </CardHeader>
            <CardContent>
              <DomainCard
                storeId={store.id}
                isPro={plan === "pro"}
                initialDomain={store.customDomain}
                initialVerified={Boolean(store.domainVerifiedAt)}
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="tracking-tight">
                {t("paymentsTitle")}
              </CardTitle>
              <CardDescription>{t("paymentsText")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectButton
                storeId={store.id}
                connected={Boolean(store.stripeAccountId)}
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="tracking-tight">
                {t("shippingTitle")}
              </CardTitle>
              <CardDescription>{t("shippingText")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ShippingForm
                storeId={store.id}
                initialShippingCents={store.shippingCents}
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="tracking-tight">
                {t("legalTitle")}
              </CardTitle>
              <CardDescription>{t("legalText")}</CardDescription>
            </CardHeader>
            <CardContent>
              <LegalForm
                storeId={store.id}
                initial={{
                  legalName: store.legalName,
                  legalTaxId: store.legalTaxId,
                  legalAddress: store.legalAddress,
                  contactEmail: store.contactEmail,
                }}
              />
            </CardContent>
          </Card>

        </div>
      </div>

      <Button variant="outline" className="w-fit rounded-full" asChild>
        <Link href="/dashboard">← {t("backToPanel")}</Link>
      </Button>
    </div>
  );
}
