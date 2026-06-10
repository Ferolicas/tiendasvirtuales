"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
      <h2 className="text-xl font-semibold">Algo ha salido mal</h2>
      <p className="text-sm text-muted-foreground">
        Ha ocurrido un error inesperado. Inténtalo de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
