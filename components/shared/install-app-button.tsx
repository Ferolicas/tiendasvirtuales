"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Evento de instalación PWA (no estándar; Chrome/Edge/Android).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Logo de Android (robot).
function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 18c0 .55.45 1 1 1h1v3.5a1.5 1.5 0 0 0 3 0V19h2v3.5a1.5 1.5 0 0 0 3 0V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8A1.5 1.5 0 0 0 2 9.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 3.5 8zm17 0a1.5 1.5 0 0 0-1.5 1.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 20.5 8zm-4.97-5.84l1.3-1.3a.5.5 0 0 0-.7-.7l-1.48 1.48A5.96 5.96 0 0 0 12 1c-.96 0-1.86.22-2.66.62L7.86.14a.5.5 0 1 0-.7.7l1.3 1.3A5.99 5.99 0 0 0 6 7h12a5.99 5.99 0 0 0-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  );
}

// Botón "Instalar App": instala la PWA sin fricción (sin "apps desconocidas").
// Si el navegador no soporta el prompt nativo (p. ej. iOS) muestra una pista.
export function InstallAppButton({ label }: { label: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setHint(true);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
      <Button
        size="lg"
        onClick={onClick}
        className="h-12 w-full rounded-full bg-[#3DDC84] px-7 text-base font-semibold text-black hover:bg-[#34c577] sm:w-auto"
      >
        <AndroidIcon className="size-5" />
        {label}
      </Button>
      {hint ? (
        <p className="max-w-xs text-center text-xs font-light text-muted-foreground">
          Abre el menú de tu navegador y elige «Instalar app» o «Añadir a
          pantalla de inicio».
        </p>
      ) : null}
    </div>
  );
}
