import { Suspense } from "react";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores, users } from "@/lib/db/schema";
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
import { CreateStoreForm } from "@/components/shared/create-store-form";
import { BillingCard } from "@/components/shared/billing-card";
import { DangerZone } from "@/components/shared/danger-zone";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("dashboard");

  const [own, [me]] = await Promise.all([
    db
      .select()
      .from(stores)
      .where(
        and(eq(stores.ownerId, session.user.id), isNull(stores.deletedAt))
      ),
    db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
  ]);
  const plan = me?.plan ?? "free";

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {own.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {own.map((store) => (
            <Card key={store.id} className="hover-lift rounded-3xl shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="tracking-tight">{store.name}</CardTitle>
                  <Badge
                    className="rounded-full"
                    variant={plan === "pro" ? "default" : "secondary"}
                  >
                    {plan}
                  </Badge>
                </div>
                <CardDescription>
                  {store.description ?? t("noDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" asChild className="rounded-full">
                  <Link href={`/dashboard/stores/${store.id}`}>
                    {t("manage")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="rounded-full"
                >
                  <Link href={`/s/${store.slug}`} target="_blank">
                    {t("viewStore")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noStores")}</p>
      )}

      <Card className="max-w-md rounded-3xl shadow-soft">
        <CardHeader>
          <CardTitle className="tracking-tight">{t("newStoreTitle")}</CardTitle>
          <CardDescription>{t("newStoreSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateStoreForm />
        </CardContent>
      </Card>

      <Suspense>
        <BillingCard plan={plan} />
      </Suspense>

      <DangerZone />
    </div>
  );
}
