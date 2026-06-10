# Backlog priorizado — Vendi (by Olcas)

> P0 bloquea el lanzamiento · P1 primera semana · P2 después.
> Cada grupo se implementa, se pushea (CI despliega) y se verifica en producción.

## P0 — Bloquea el lanzamiento

- [x] **P0.1 Rebranding a Vendi + dominio**: DNS `vendi.olcas.app`, vhost Caddy
      (redirect 301 desde `tiendas.olcas.app`), APP_URL/AUTH_URL, textos y
      metadata. ✅ 2026-06-10
- [x] **P0.2 Design system premium**: tema cálido minimal-lujo con coral de
      marca, micro-animaciones, mobile-first, landing nueva. ✅ 2026-06-10
- [x] **P0.3 i18n plataforma ES+EN** (next-intl): rutas /[locale], selector
      de idioma, hreflang en metadata. ✅ 2026-06-10
- [x] **P0.4 Auth completa**: verificación de email, reset de contraseña,
      borrado de cuenta con anonimización. Emails Resend listos (pendiente
      API key). ✅ 2026-06-10
- [x] **P0.5 Stripe completo**: suscripción Pro 9,99 € (Checkout + Portal +
      webhooks), Connect Express, application_fee 3 %/1 %, Stripe Tax con
      degradación. Pendiente: claves live + webhook en dashboard de Stripe.
      ✅ código 2026-06-10
- [x] **P0.6 Envíos simples**: precio por tienda sumado en servidor.
      ✅ 2026-06-10
- [x] **P0.7 Límites de plan** en servidor (free: 1 tienda / 10 productos).
      ✅ 2026-06-10
- [x] **P0.8 Cloudflare Turnstile** en registro y checkout (se activa al
      poner las claves en .env). ✅ código 2026-06-10
- [x] **P0.9 Legal ES/EN**: 4 páginas + footer + legal autogenerado por
      tienda. Pendiente: rellenar [NIF] y [DIRECCIÓN FISCAL]. ✅ 2026-06-10
- [x] **P0.10 Operación**: backup diario 04:00 con rotación 14 días y
      restauración probada; uptime cada 5 min con email al fundador;
      sitemap + robots + OG. ✅ 2026-06-10

## P1 — Primera semana

- [ ] **P1.1 Roles**: tabla `store_members` (owner/staff); staff gestiona
      productos y pedidos, no cobros ni plan.
- [ ] **P1.2 Multi-idioma de tiendas**: contenido de tienda y catálogo en
      ES/EN editable por el dueño.
- [ ] **P1.3 Dominio propio por tienda**: conexión de dominio del cliente
      (CNAME + TLS on-demand en Caddy), solo plan Pro.
- [ ] **P1.4 Imágenes**: subida a R2 con URL presignada desde el panel,
      `next/image` optimizado (pendiente de claves R2).
- [ ] **P1.5 Gestión de pedidos**: detalle, cambio de estado
      (pendiente→pagado→enviado), búsqueda.
- [ ] **P1.6 Umami analytics** self-host en el VPS.

## P2 — Después

- [ ] **P2.1 CRM interno**: panel admin de usuarios/leads sobre PostgreSQL
      (sustituye a HubSpot).
- [ ] **P2.2 Compra de dominios desde la app** (API de Cloudflare Registrar).
- [ ] **P2.3 Temas/plantillas visuales por tienda.**
- [ ] **P2.4 Notificaciones por email al comprador** (confirmación de pedido,
      cambios de estado).
- [ ] **P2.5 PWA** (instalable, notificaciones push para dueños).
