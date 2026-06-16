"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const PERIODS = [
  { id: "1", label: "1 mes", per: "$50.000/mes", price: "$50.000", save: null },
  {
    id: "3",
    label: "3 meses",
    per: "$45.000/mes",
    price: "$135.000",
    save: "-10%",
  },
  {
    id: "12",
    label: "1 año",
    per: "$40.000/mes",
    price: "$480.000",
    save: "-20%",
  },
] as const;

// Logo Pro animado (metalizado azul con reflejo). Al pulsar abre el modal de
// elegir periodo y de ahí va directo al checkout de Mercado Pago. Solo para
// vendedores en plan Gratis.
export function ProBadge() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<string>("3");

  async function checkout() {
    setLoading(true);
    const res = await fetch("/api/billing/mp-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
    }
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-white shadow-soft transition-transform hover:scale-105"
        style={{
          background:
            "linear-gradient(110deg,#1e3a8a,#2563eb,#22d3ee,#2563eb,#1e3a8a)",
        }}
      >
        <style>{`@keyframes vendiShine{0%{transform:translateX(-160%) skewX(-12deg)}55%,100%{transform:translateX(320%) skewX(-12deg)}}`}</style>
        <span className="relative z-10">★ Hazte Pro</span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)",
            animation: "vendiShine 3s ease-in-out infinite",
          }}
        />
      </button>

      <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
        <DrawerContent className="max-h-[92dvh]">
          <div className="mx-auto w-full max-w-md max-h-[85dvh] overflow-y-auto px-4 pb-8">
            <DrawerHeader className="px-0">
              <DrawerTitle className="tracking-tight">
                vendi<span className="text-brand">.</span>{" "}
                <span className="font-light text-muted-foreground">Pro</span>
              </DrawerTitle>
            </DrawerHeader>
            <p className="mb-4 text-sm text-muted-foreground">
              Tiendas y productos ilimitados, dominio propio y solo 1% de
              comisión por venta.
            </p>
            <div className="grid gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-colors ${
                    period === p.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/30"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold tracking-tight">
                      {p.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.per}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.save ? (
                      <Badge className="rounded-full bg-green-600/12 text-green-700 dark:text-green-300">
                        {p.save}
                      </Badge>
                    ) : null}
                    <span className="text-sm font-extrabold tracking-tight">
                      {p.price}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <Button
              onClick={checkout}
              disabled={loading}
              className="mt-4 w-full rounded-full"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Pagar con Mercado Pago
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
