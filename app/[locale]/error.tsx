"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { VendiDot } from "@/components/shared/vendi-dot";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-24">
      <div className="hero-glow w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-soft">
        <p className="text-xl font-extrabold tracking-tight">
          vendi<span className="text-brand">.</span>
        </p>
        <p className="mt-5 flex items-center justify-center gap-1.5 font-bold tracking-tight">
          <VendiDot className="size-1.5" />
          {t("error")}
        </p>
        <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
          {t("errorDescription")}
        </p>
        <Button onClick={reset} className="mt-6 rounded-full">
          <RotateCcw className="size-4" />
          {t("retry")}
        </Button>
      </div>
    </main>
  );
}
