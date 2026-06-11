import type { LucideIcon } from "lucide-react";
import { VendiDot } from "@/components/shared/vendi-dot";
import { cn } from "@/lib/utils";

// Estado vacío diseñado: icono en círculo de acento, título con el punto
// vendi y una pista de qué hacer. Nunca una línea de texto suelta.
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <p className="flex items-center gap-1.5 font-bold tracking-tight">
        <VendiDot className="size-1.5" />
        {title}
      </p>
      <p className="max-w-xs text-sm font-light leading-relaxed text-muted-foreground">
        {hint}
      </p>
      {action}
    </div>
  );
}
