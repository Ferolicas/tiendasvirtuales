"use client";

import { ClipboardList, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Pestañas principales del vendedor: lo importante a la vista — Pedidos y
// Productos. El resto (perfil, datos+suscripción, tiendas) vive en el avatar.
export function MasterTabs() {
  const t = useTranslations("comanda");
  const td = useTranslations("dashboard");
  const pathname = usePathname();
  const isOrders = pathname.startsWith("/dashboard/orders");
  const isProducts = pathname.startsWith("/dashboard/products");

  const base =
    "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold tracking-tight transition-colors";
  const active = "bg-primary text-primary-foreground";
  const inactive = "text-muted-foreground hover:text-foreground";

  return (
    <nav className="flex gap-1 rounded-full border p-1">
      <Link
        href="/dashboard/orders"
        className={`${base} ${isOrders ? active : inactive}`}
      >
        <ClipboardList className="size-4" />
        {t("masterOrders")}
      </Link>
      <Link
        href="/dashboard/products"
        className={`${base} ${isProducts ? active : inactive}`}
      >
        <Package className="size-4" />
        {td("tabProducts")}
      </Link>
    </nav>
  );
}
