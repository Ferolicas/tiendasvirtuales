# Decisiones de producto — TiendasVirtuales

> Registro vivo de las decisiones tomadas durante el refinamiento.
> Fuente: entrevista con el fundador, 2026-06-10.

## Bloque 1 — Producto y usuarios

- **Problema**: pequeños negocios y emprendedores que venden por WhatsApp/Instagram
  sin catálogo ni control de pedidos, o que no pueden pagar agencia/Shopify.
- **Usuario objetivo**: ambos segmentos por igual — comercio local (restaurantes,
  panaderías, moda…) y emprendedores digitales. El copy no se especializa.
- **Funcionalidad estrella**: las tres a la vez, como paquete:
  1. Tienda lista en 5 minutos (registro → enlace compartible).
  2. Pedidos en tiempo real (panel en vivo tipo TPV).
  3. Todo incluido con pagos (Stripe integrado sin configuración técnica).
- **SÍ entra en v1** (ampliado por el fundador):
  - Envíos/logística simple: **el dueño establece el precio del envío** por tienda.
  - **Dominio propio por tienda**: opción de compra/conexión directa con Cloudflare
    para que cada cliente tenga su dominio.
  - **Multi-idioma** en las tiendas.
- **NO entra en v1**: app móvil nativa (solo web responsive).
- **Posicionamiento**: **premium**. "Shopify ultra simple": simplicidad de UX
  (el usuario hace todo muy fácil) pero diseño, botones, tipografía y acabados
  de nivel premium. También es el upgrade serio de WhatsApp Business + catálogo:
  una tienda profesional de verdad, no un catálogo básico.
- **Competidores de referencia**: Shopify (calidad), WhatsApp Business (statu quo
  a desbancar).

## Bloque 2 — UX/UI y marca

- **Nombre comercial**: **Vendi** (firmado «by Olcas», la marca madre es Olcas Apps).
  Tagline ES: «Tu tienda online, lista en minutos.» / EN: «Your store, live in minutes.»
- **Dominio**: pasar a `vendi.olcas.app` como principal; `tiendas.olcas.app`
  se mantiene como redirección (el registro DNS y vhost actuales no se borran).
- **Estética**: fusión de minimal-lujo (Apple/Linear: blanco/negro, tipografía
  grande, micro-animaciones sutiles) + calidez Airbnb (esquinas redondeadas,
  fotografía protagonista, cercano pero pulido). Acabados premium en botones,
  fuentes y detalles.
- **Idiomas de la plataforma**: ES + EN desde el día 1 (next-intl). Las tiendas
  de los clientes también multi-idioma (decidido en bloque 1).
- **Dispositivo**: mobile-first; el escritorio hereda.

## Bloque 3 — Monetización

- **Modelo**: Freemium + Pro.
  - **Gratis**: 1 tienda, catálogo limitado (p. ej. 10 productos), comisión 3 %
    por venta, subdominio `/s/<slug>`.
  - **Pro — 9,99 €/mes**: tiendas/productos ilimitados, comisión 1 %, dominio
    propio, multi-idioma de tienda.
- **Comisión por venta** (vía Stripe Connect `application_fee`): Gratis 3 % / Pro 1 %.
- **Precio agresivo de entrada**: 9,99 €/mes (muy por debajo de Shopify ~36 €)
  para captar volumen; revisable cuando haya tracción.
- **Fiscal**: Stripe Tax + facturación automática (IVA por país, NIF/CIF en
  factura). Sin gestión manual de impuestos.

## Bloque 4 — Datos y legal (España/UE)

- **Responsable del tratamiento**: «Olcas Apps», NIF 60739837B, Avenida
  Torreón del Alcázar 11, 13001 Ciudad Real, España (datos reales integrados
  el 2026-06-11).
- **Datos tratados**: dueños (nombre, email, hash de contraseña), compradores
  (nombre, email por pedido), pagos (Stripe, encargado), emails (Resend,
  encargado), CRM (HubSpot, encargado). Imágenes en Cloudflare R2.
- **Analytics**: Umami (self-host en el VPS) o Plausible — sin cookies, sin
  banner de consentimiento. Solo política de cookies informativa (técnicas).
- **Borrado de cuenta**: autoservicio inmediato desde el panel. Borra usuario,
  tiendas y productos; los pedidos se **anonimizan** (obligación fiscal de
  conservar facturación).
- **Legal de las tiendas**: Vendi autogenera aviso legal y política de
  devoluciones por tienda a partir de los datos que el dueño rellena en ajustes.
- **Páginas requeridas**: aviso legal, privacidad, cookies, términos de
  servicio — enlazadas en el footer en ES y EN.

## Bloque 5 — Seguridad

- **Roles**: dueño + **empleados** desde v1. Tabla `store_members` con rol
  (`owner` | `staff`); staff puede gestionar productos y pedidos pero no
  cobros, plan ni borrado de tienda.
- **Anti-spam**: rate limiting por IP en registro y checkout. Se descartó
  Cloudflare Turnstile (2026-06-12): bloqueaba registros reales de clientes.
- **Email auth**: verificación de email al registrarse + recuperación de
  contraseña, ambos vía Resend con plantillas propias.
- **Ya implementado de base**: Zod en todos los endpoints, rate limiting
  en memoria en endpoints públicos, HSTS/CSP/X-Frame-Options, bcrypt(12),
  totales calculados solo en servidor, scoping por propietario.
- **Backup**: cron diario `pg_dump tiendasvirtuales_db | gzip → /var/backups`,
  rotación 14 días, restauración probada al menos una vez.

## Bloque 6 — Crecimiento y operación

- **Emails (Resend)**: dominio de envío `olcas.app` verificado en Resend
  (DNS en Cloudflare); remitente `vendi@olcas.app`. Sirve a todo el holding.
- **CRM**: **sin HubSpot**. CRM propio sobre PostgreSQL: los registros ya
  viven en la tabla `users`; en P2 se añade un panel admin interno de
  leads/usuarios. (HubSpot era un CRM SaaS de terceros; el fundador no tiene
  cuenta y prefiere no depender de él.)
- **Uptime**: cron en el VPS (curl a /api/health cada 5 min) con aviso por
  email vía Resend **solo al fundador** si falla. Sin servicios externos.
- **SEO**: ES + EN por igual desde el día 1 — sitemap, robots, metas,
  Open Graph y hreflang completos en ambos idiomas.
- **Analytics**: Umami self-host en el VPS (sin cookies, sin banner).
