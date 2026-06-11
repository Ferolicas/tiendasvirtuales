"use client";

import { ClipboardList, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Pestañas maestras del panel: Tiendas | Pedidos.
export function MasterTabs() {
  const t = useTranslations("comanda");
  const pathname = usePathname();
  const isOrders = pathname.startsWith("/dashboard/orders");

  const base =
    "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold tracking-tight transition-colors";
  const active = "bg-primary text-primary-foreground";
  const inactive = "text-muted-foreground hover:text-foreground";

  return (
    <nav className="flex gap-1 rounded-full border p-1">
      <Link
        href="/dashboard"
        className={`${base} ${!isOrders ? active : inactive}`}
      >
        <Store className="size-4" />
        {t("masterStores")}
      </Link>
      <Link
        href="/dashboard/orders"
        className={`${base} ${isOrders ? active : inactive}`}
      >
        <ClipboardList className="size-4" />
        {t("masterOrders")}
      </Link>
    </nav>
  );
}
