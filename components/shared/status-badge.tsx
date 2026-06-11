import {
  Archive,
  CheckCheck,
  CheckCircle2,
  ChefHat,
  Clock,
  Truck,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Regla del holding: cada estado tiene color + icono + etiqueta propios y
// traducidos. Jamás el valor crudo de la base de datos en pantalla.
const STATUS_STYLES = {
  pending: {
    icon: Clock,
    className:
      "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  paid: {
    icon: CheckCircle2,
    className:
      "bg-green-600/12 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  },
  preparing: {
    icon: ChefHat,
    className:
      "bg-orange-500/12 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
  },
  ready: {
    icon: Truck,
    className:
      "bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  },
  delivered: {
    icon: CheckCheck,
    className:
      "bg-emerald-600/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  // Legado v1: visualmente igual que entregado.
  shipped: {
    icon: CheckCheck,
    className:
      "bg-emerald-600/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  archived: {
    icon: Archive,
    className: "bg-secondary text-muted-foreground",
  },
  cancelled: {
    icon: XCircle,
    className:
      "bg-red-500/12 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  },
} as const;

export type OrderStatus = keyof typeof STATUS_STYLES;

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t = useTranslations("status");
  const key: OrderStatus =
    status in STATUS_STYLES ? (status as OrderStatus) : "pending";
  const style = STATUS_STYLES[key];
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        style.className,
        className
      )}
    >
      <Icon className="size-3" />
      {t(key)}
    </span>
  );
}
