"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { VendiDot } from "@/components/shared/vendi-dot";

// Tarjeta de celebración del momento Pro: entrada con spring, lluvia breve
// de puntos vendi y mensaje de bienvenida. Nunca un texto plano.
export function ProCelebration({ onClose }: { onClose: () => void }) {
  const t = useTranslations("celebration");
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.92, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="hero-glow relative overflow-hidden rounded-3xl border-2 border-brand/40 bg-card p-8 text-center shadow-soft"
    >
      {!reduced
        ? Array.from({ length: 7 }).map((_, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute top-0 size-1.5 rounded-full bg-brand"
              style={{ left: `${12 + i * 12}%` }}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 120 + (i % 3) * 40, opacity: [0, 1, 0] }}
              transition={{
                duration: 1.4,
                delay: 0.15 + i * 0.07,
                ease: "easeIn",
              }}
            />
          ))
        : null}
      <p className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand/10">
        <VendiDot pulse className="size-3" />
      </p>
      <h3 className="text-2xl font-extrabold tracking-tight">
        {t("proTitle")}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
        {t("proText")}
      </p>
      <Button onClick={onClose} className="mt-6 rounded-full">
        {t("proCta")}
      </Button>
    </motion.div>
  );
}
