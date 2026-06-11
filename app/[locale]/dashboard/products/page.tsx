import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories, products, stores } from "@/lib/db/schema";
import {
  ProductsManager,
  type CategoryOption,
} from "@/components/dashboard/products-manager";
import { SubTabs } from "@/components/dashboard/sub-tabs";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("tabProducts") };
}

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const own = await db
    .select({ id: stores.id, name: stores.name, currency: stores.currency })
    .from(stores)
    .where(and(eq(stores.ownerId, session.user.id), isNull(stores.deletedAt)))
    .orderBy(asc(stores.name));
  const storeIds = own.map((s) => s.id);

  const [productList, categoryList] = storeIds.length
    ? await Promise.all([
        db
          .select()
          .from(products)
          .where(inArray(products.storeId, storeIds))
          .orderBy(desc(products.createdAt)),
        db
          .select()
          .from(categories)
          .where(inArray(categories.storeId, storeIds))
          .orderBy(asc(categories.position), asc(categories.name)),
      ])
    : [[], []];

  const storeNameById = new Map(own.map((s) => [s.id, s.name]));
  const categoriesByStore: Record<string, CategoryOption[]> = {};
  for (const category of categoryList) {
    categoriesByStore[category.storeId] = [
      ...(categoriesByStore[category.storeId] ?? []),
      { id: category.id, name: category.name },
    ];
  }

  return (
    <div className="grid gap-8">
      <SubTabs />
      <ProductsManager
        stores={own}
        products={productList.map((product) => ({
          id: product.id,
          storeId: product.storeId,
          storeName: storeNameById.get(product.storeId) ?? "",
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          imageUrl: product.imageUrl,
          stock: product.stock,
          unlimitedStock: product.unlimitedStock,
          recommended: product.recommended,
          active: product.active,
          salesCount: product.salesCount,
          categoryId: product.categoryId,
        }))}
        categoriesByStore={categoriesByStore}
      />
    </div>
  );
}
