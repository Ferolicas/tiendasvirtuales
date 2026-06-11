"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Sub-pestañas de la sección Tiendas: Datos y suscripción | Tiendas | Productos
export function SubTabs() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard", label: t("tabAccount"), exact: true },
    { href: "/dashboard/stores", label: t("tabStores"), exact: true },
    { href: "/dashboard/products", label: t("tabProducts"), exact: true },
  ];

  return (
    <nav className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-bold tracking-tight transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
