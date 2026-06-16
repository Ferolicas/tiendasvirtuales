"use client";

import { useState } from "react";

// Logo Pro animado (metalizado azul con reflejo que pasa de lado a lado).
// Al pulsar, abre el cobro de la suscripción por Mercado Pago. Solo se muestra
// a vendedores en plan Gratis.
export function ProBadge() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const res = await fetch("/api/billing/mp-subscribe", { method: "POST" });
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
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="relative overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-extrabold tracking-wide text-white shadow-soft transition-transform hover:scale-105 disabled:opacity-70"
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
  );
}
