import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores, users } from "@/lib/db/schema";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ConnectButton,
  DomainCard,
  LegalForm,
  ShippingForm,
} from "@/components/shared/store-settings";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("advancedSettings") };
}

// Ajustes avanzados de una tienda: cobros, envío, dominio propio y legal.
// Lo básico (nombre, logo, banner, horario…) se edita en el modal de la
// pestaña Tiendas; los pedidos viven en la comanda y los productos en su
// pestaña global.
export default async function StoreAdvancedPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("dashboard");

  const { storeId } = await params;
  const [row] = await db
    .select({ store: stores, plan: users.plan })
    .from(stores)
    .innerJoin(users, eq(stores.ownerId, users.id))
    .where(
      and(
        eq(stores.id, storeId),
        eq(stores.ownerId, session.user.id),
        isNull(stores.deletedAt)
      )
    )
    .limit(1);
  if (!row) notFound();
  const store = row.store;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {store.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("advancedSettings")} ·{" "}
          <Link
            href={`/s/${store.slug}`}
            target="_blank"
            className="underline-offset-2 hover:underline"
          >
            /s/{store.slug}
          </Link>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit rounded-3xl shadow-soft">
          <CardHeader>
            <CardTitle className="tracking-tight">
              {t("paymentsTitle")}
            </CardTitle>
            <CardDescription>{t("paymentsText")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectButton
              storeId={store.id}
              connected={store.chargesEnabled}
              hasAccount={Boolean(store.stripeAccountId)}
            />
          </CardContent>
        </Card>

        <Card className="h-fit rounded-3xl shadow-soft">
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

        <Card className="h-fit rounded-3xl shadow-soft">
          <CardHeader>
            <CardTitle className="tracking-tight">{t("domainTitle")}</CardTitle>
            <CardDescription>{t("domainText")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DomainCard
              storeId={store.id}
              isPro={row.plan === "pro"}
              initialDomain={store.customDomain}
              initialVerified={Boolean(store.domainVerifiedAt)}
            />
          </CardContent>
        </Card>

        <Card className="h-fit rounded-3xl shadow-soft">
          <CardHeader>
            <CardTitle className="tracking-tight">{t("legalTitle")}</CardTitle>
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

      <Button variant="outline" className="w-fit rounded-full" asChild>
        <Link href="/dashboard/stores">← {t("backToPanel")}</Link>
      </Button>
    </div>
  );
}
