import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AccountPanel } from "@/components/dashboard/account-panel";
import { SubTabs } from "@/components/dashboard/sub-tabs";
import { PushCard } from "@/components/dashboard/push-card";
import { BillingCard } from "@/components/shared/billing-card";
import { DangerZone } from "@/components/shared/danger-zone";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("tabAccount") };
}

// Pestaña principal: Datos y suscripción.
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [me] = await db
    .select({
      email: users.email,
      name: users.name,
      phone: users.phone,
      taxId: users.taxId,
      address: users.address,
      plan: users.plan,
      proUntil: users.proUntil,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!me) redirect("/login");

  return (
    <div className="grid gap-8">
      <SubTabs />
      <AccountPanel
        profile={{
          email: me.email,
          name: me.name,
          phone: me.phone,
          taxId: me.taxId,
          address: me.address,
        }}
      />
      <PushCard />
      <Suspense>
        <BillingCard
          plan={me.plan}
          proUntil={me.proUntil ? me.proUntil.toISOString() : null}
        />
      </Suspense>
      <DangerZone />
    </div>
  );
}
