# DESIGN.md — El ADN visual de Vendi

> Fuente de verdad del sistema de diseño. Si algo nuevo no encaja con este
> documento, o se corrige el diseño o se actualiza este documento — nunca
> se ignora.

## Dirección: «suizo minimal»

Lujo silencioso al estilo Apple/Stripe con calidez mediterránea. El
carácter sale del **contraste de peso tipográfico y el espacio**, no de
adornos. Referencias: Linear (precisión), Stripe (confianza), Airbnb
(calidez).

## Tipografía

- **Una sola familia**: Geist (variable, `next/font`), con Geist Mono para
  cifras técnicas si hace falta.
- **Titulares**: peso 800 (`font-extrabold`), tracking negativo
  (−0.03 a −0.035 em), tamaños editoriales con `clamp()` — el hero llega a
  `clamp(2.9rem, 9vw, 6.75rem)` con `leading-[0.98]`.
- **Cuerpo de apoyo**: peso 300 (`font-light`) y `leading-relaxed`.
- **Kickers/etiquetas**: uppercase con `tracking-[0.18em]`, tamaño xs.
- Regla: la jerarquía se construye con 800 contra 300; los pesos medios
  (500-700) solo para UI funcional (botones, labels, nombres).

## Tokens (app/globals.css)

Modo claro — crema cálida:
- `--background` oklch(0.993 0.004 85) · `--foreground` oklch(0.18 0.012 50)
- `--brand` (coral terracota) oklch(0.63 0.19 25) — SOLO para la firma,
  acentos y momentos vivos; nunca como color de botón primario.
- `--primary` casi-negro cálido · `--accent` blush oklch(0.955 0.02 30)
- `--radius` 0.875rem; tarjetas a `rounded-3xl`.

Modo oscuro — «noche cálida» (mismos matices tostados, coral más vivo):
- `--background` oklch(0.16 0.008 60) · `--brand` oklch(0.7 0.17 25)
- Gestionado por next-themes (`attribute="class"`, sistema + toggle).

⚠️ Trampa conocida: el init de shadcn puede dejar `--font-sans: var(--font-sans)`
(circular → serif del sistema). Debe apuntar a `var(--font-geist-sans)`.

## Elemento firma: el punto vendi ●

El punto coral del wordmark `vendi●` cobra vida (components/shared/vendi-dot.tsx):
- `VendiDot` — punto estático o latiendo (pasos 01·02·03, títulos de
  estados vacíos, badge del hero).
- `VendiLiveDot` — pulso + anillo expandiéndose: estados «en directo».
- `VendiLoader` — wordmark con el punto rebotando: TODA carga de marca.
Regla: máximo un punto animado por vista (el lujo es contención).

## Motion

- Librería: **motion** (Framer). Entradas con `Reveal`
  (components/shared/reveal.tsx): spring stiffness 220 / damping 26,
  fade-up 22px, `whileInView` una vez, stagger por `delay` (+0.08s).
- Micro: botones con `active:scale-[0.985]` + `translate-y-px`; tarjetas
  `hover-lift` (−4px + sombra); duraciones CSS 150–400 ms.
- Celebraciones: tarjeta con spring + lluvia breve de puntos vendi
  (pro-celebration.tsx). Nunca un texto plano.
- `prefers-reduced-motion` se respeta SIEMPRE (Reveal y keyframes).

## Materiales

- Superficies: tarjetas blancas/`--card` sobre fondo crema, `shadow-soft`
  (sombra multicapa suave), bordes `--border` cálidos.
- Glass solo en headers sticky (`bg-background/80 backdrop-blur-md`).
- `hero-glow`: radial del acento tokenizado — único efecto atmosférico.

## Estados (regla dura del holding)

Cada estado = color + icono + etiqueta traducida (status-badge.tsx):
pendiente ámbar ⏱ · pagado verde ✓ · enviado azul 🚚 · cancelado rojo ✕.
Estados vacíos con EmptyState (icono en acento + punto vendi + pista).
Feedback con toasts sonner tematizados (top-center, tokens de marca).

## Componentes propios (inventario)

`vendi-dot` (firma) · `reveal` (motion) · `status-badge` · `empty-state` ·
`toaster` · `pro-celebration` · `theme-toggle` · `locale-switcher` ·
`password-input` · `turnstile` · `legal-page` (shell legal) ·
`orders-panel` (pedidos: buscar/filtrar/drawer/transiciones/realtime) ·
`products-panel` (catálogo: optimistic, foto, drawer edición) ·
`store/storefront` (escaparate: tarjetas, detalle, carrito, checkout,
confirmación) · `billing-card` · `store-settings` · `danger-zone`.

## Idioma y accesibilidad

- Cero strings fuera del idioma del visitante (next-intl, ES defecto /EN).
- Contraste AA: `--muted-foreground` ≥ oklch(0.45) en claro.
- Focus visible (ring coral), navegación por teclado, aria-labels en
  iconos solos.

## Emails

Plantillas HTML en lib/email.ts con el wordmark `vendi●`, botón píldora
casi-negro y pie «by Olcas Apps». Bilingües ES/EN en el mismo cuerpo.
