"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// Compartir nativo (WhatsApp, Telegram, Instagram…) con fallback a copiar.
export function ShareButton({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const t = useTranslations("store");

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // cancelado por el usuario
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={t("share")}
      className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-background/85 text-foreground shadow-soft backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
    >
      <Share2 className="size-4.5" />
    </button>
  );
}
