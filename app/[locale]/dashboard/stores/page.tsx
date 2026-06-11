import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores, users } from "@/lib/db/schema";
import { StoresManager } from "@/components/dashboard/stores-manager";
import { SubTabs } from "@/components/dashboard/sub-tabs";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("tabStores") };
}

export default async function StoresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [own, [me]] = await Promise.all([
    db
      .select()
      .from(stores)
      .where(
        and(eq(stores.ownerId, session.user.id), isNull(stores.deletedAt))
      )
      .orderBy(desc(stores.createdAt)),
    db
      .select({
        email: users.email,
        name: users.name,
        phone: users.phone,
        taxId: users.taxId,
        address: users.address,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
  ]);

  return (
    <div className="grid gap-8">
      <SubTabs />
      <StoresManager
        stores={own.map((store) => ({
          id: store.id,
          name: store.name,
          slug: store.slug,
          description: store.description,
          logoUrl: store.logoUrl,
          bannerUrl: store.bannerUrl,
          bannerPreset: store.bannerPreset,
          schedule: store.schedule,
          phone: store.phone,
          address: store.address,
          pickupEnabled: store.pickupEnabled,
          legalName: store.legalName,
          legalTaxId: store.legalTaxId,
          stripeAccountId: store.stripeAccountId,
        }))}
        profile={{
          email: me?.email ?? "",
          name: me?.name ?? "",
          phone: me?.phone ?? null,
          taxId: me?.taxId ?? null,
          address: me?.address ?? null,
        }}
      />
    </div>
  );
}
