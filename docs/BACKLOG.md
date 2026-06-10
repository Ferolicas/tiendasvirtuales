# Backlog priorizado — Vendi (by Olcas)

> P0 bloquea el lanzamiento · P1 primera semana · P2 después.
> Cada grupo se implementa, se pushea (CI despliega) y se verifica en producción.

## P0 — Bloquea el lanzamiento

- [ ] **P0.1 Rebranding a Vendi + dominio**: DNS `vendi.olcas.app`, vhost Caddy
      (alias + redirect 301 desde `tiendas.olcas.app`), APP_URL/AUTH_URL,
      textos y metadata.
- [ ] **P0.2 Design system premium**: tipografía y paleta (minimal-lujo +
      calidez Airbnb), micro-animaciones, botones/cards pulidos, mobile-first.
      Rehacer landing con la propuesta de valor de Vendi.
- [ ] **P0.3 i18n plataforma ES+EN** (next-intl): landing, auth, panel, tienda
      pública; hreflang.
- [ ] **P0.4 Auth completa**: verificación de email al registrarse, reset de
      contraseña (Resend, dominio olcas.app verificado) y borrado de cuenta
      autoservicio (pedidos anonimizados).
- [ ] **P0.5 Stripe completo**: suscripción Pro 9,99 €/mes (Checkout + Customer
      Portal + webhooks), Connect Express onboarding para tiendas, checkout de
      pedidos con `application_fee` (3 % free / 1 % pro) y Stripe Tax.
- [ ] **P0.6 Envíos simples**: precio de envío configurable por tienda,
      sumado al total del pedido.
- [ ] **P0.7 Límites de plan**: free = 1 tienda y 10 productos; pro =
      ilimitado. Aplicados en servidor.
- [ ] **P0.8 Cloudflare Turnstile** en registro y checkout público.
- [ ] **P0.9 Legal ES/EN**: aviso legal, privacidad, cookies, términos
      (responsable «Olcas Apps» con placeholders), footer; plantilla legal
      autogenerada por tienda (datos del dueño en ajustes).
- [ ] **P0.10 Operación**: backup diario `pg_dump` con rotación 14 días
      (+ restauración probada), cron de uptime con aviso por email al fundador,
      SEO completo (sitemap, robots, OG ES/EN).

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
