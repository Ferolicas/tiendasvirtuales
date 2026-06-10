"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
      <h2 className="text-xl font-semibold">{t("error")}</h2>
      <p className="text-sm text-muted-foreground">{t("errorDescription")}</p>
      <Button onClick={reset} className="rounded-full">
        {t("retry")}
      </Button>
    </main>
  );
}
