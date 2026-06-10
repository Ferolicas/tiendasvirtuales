"use client";

import Script from "next/script";

// Widget de Cloudflare Turnstile (invisible/managed). Inserta un input
// oculto "cf-turnstile-response" dentro del formulario que lo contiene.
// Si NEXT_PUBLIC_TURNSTILE_SITE_KEY no está configurada, no renderiza nada
// (el servidor tampoco exige el token en ese caso).
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div className="cf-turnstile" data-sitekey={siteKey} data-size="flexible" />
    </>
  );
}
