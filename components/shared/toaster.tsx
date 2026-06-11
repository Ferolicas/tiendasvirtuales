"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

// Toasts de la marca: tipografía y tokens de Vendi, tema sincronizado.
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      toastOptions={{
        style: {
          borderRadius: "1rem",
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 30px -12px oklch(0.18 0.012 50 / 0.18)",
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    />
  );
}
