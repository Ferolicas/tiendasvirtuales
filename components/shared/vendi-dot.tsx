import { cn } from "@/lib/utils";

// El punto vendi — la firma visual de la marca. El mismo punto coral del
// logo aparece latiendo en estados "en vivo", rebotando como loader y
// marcando pasos. Un solo motivo, repetido con sutileza.

export function VendiDot({
  className,
  pulse = false,
}: {
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 rounded-full bg-brand",
        pulse && "vendi-dot-pulse",
        className
      )}
    />
  );
}

export function VendiLiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2", className)}>
      <span
        aria-hidden
        className="vendi-dot-ring absolute inset-0 rounded-full bg-brand"
      />
      <span className="vendi-dot-pulse relative inline-flex size-2 rounded-full bg-brand" />
    </span>
  );
}

export function VendiLoader({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label ?? "Cargando"}
      className={cn("flex flex-col items-center gap-3", className)}
    >
      <span className="text-xl font-extrabold tracking-tight">
        vendi
        <span className="vendi-dot-bounce ml-0.5 inline-block size-[0.45em] rounded-full bg-brand" />
      </span>
      {label ? (
        <span className="text-xs text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}
