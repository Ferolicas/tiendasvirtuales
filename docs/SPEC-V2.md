# SPEC V2 — Vendi como marketplace operativo (estándar de TODAS las tiendas)

> Especificación dictada por el fundador el 2026-06-11. Fuente de verdad
> de la v2; se implementa por iteraciones desplegadas (V2-1 … V2-5).

## 1. Escaparate (estilo Uber Eats)

- **Cabecera**: banner ancho; el **logo a caballo** sobre el borde inferior
  del banner (mitad dentro, mitad fuera); debajo: nombre → calificación
  `4.3 ★ (n reseñas)` → horario de actividad → descripción → teléfono y
  dirección.
- **Compartir** (icono en el banner): `navigator.share` nativo (WhatsApp,
  Telegram, etc.) con fallback de copiar enlace.
- **Catálogo en dos divisiones**:
  1. Pestañitas **Recomendados** | **Más vendidos**.
  2. **Catálogo completo agrupado por categorías** (creadas por el dueño).
- **Descuentos**: si hay precio de comparación, se muestra tachado + badge
  `-X%` calculado automáticamente. Stripe cobra SIEMPRE el precio real.
- **Stock en el front**: ilimitado → no se muestra nada; ≤10 → «Solo
  quedan X»; >10 → «Unidades disponibles»; 0 → «Agotado» (no comprable).
- **Footer**: plan Pro oculta «Tienda creada con Vendi»; en free el texto
  enlaza (clicable) a vendi.olcas.app.

## 2. Pedido del cliente

- **Checkout**: nombre, teléfono y email; elegir **Domicilio** (pide
  dirección) o **Recogida en tienda** (si la tienda lo permite). Pago:
  **tarjeta** (Stripe) siempre; **pagar en tienda** solo con recogida.
- **Número de pedido** único secuencial (contabilidad/inventario).
- **Tracking** en `/o/[id]`: estados con **animación infinita** según fase
  (estilo Burger King) actualizados en tiempo real:
  recibido → en preparación («ya está en cocina») → en reparto / «listo
  para recoger» → entregado. Muestra el teléfono de la tienda.
- **Al entregar**: el cliente puede **calificar (1-5★) y comentar**; el
  comentario firma con el nombre que puso en el pedido. Alimenta la media
  de la cabecera.

## 3. Comanda (pestaña maestra «Pedidos» del panel)

- **KPIs dinámicos**: Ventas (€ y nº, solo cobradas) · Ventas pendientes
  (las que nunca se pagaron) · Canceladas. **Top 5 productos** día/mes/año.
- **Qué entra en Entrantes**: pedidos pagados con tarjeta + pedidos
  «pagar en tienda» (recogida) aunque estén pendientes de cobro. NO entran
  los de tarjeta+domicilio que nunca se pagaron (van a pestaña Pendientes).
- **Tarjetas paralelas** Entrantes | En preparación (+ En reparto):
  comanda con hora, **contador vivo** desde la entrada, líneas del pedido,
  domicilio/recogida, cliente y teléfono, método de pago, nº de pedido.
  - Entrantes → botón **Aceptar** → pasa a En preparación, contador a 0
    guardando el tiempo de la fase anterior. Cliente ve «en cocina».
  - En preparación → **Preparado** → En reparto (o «listo» si recogida),
    contador a 0 conservando los anteriores.
  - En reparto → **Entregado** → pestaña Entregados.
  - **Cancelar** (en todas menos reparto): pide **motivo** → Cancelados.
- Orden de las listas: el más antiguo PRIMERO (lleva más tiempo esperando).
- Pestañas: Entregados · Cancelados · Pendientes. Todo multi-tienda y en
  tiempo real.

## 4. Panel del dueño (pestañas)

- **Maestras**: `Tiendas` | `Pedidos`.
- Dentro de Tiendas, sub-pestañas:
  1. **Datos y suscripción**: email (incambiable), nombre, teléfono,
     documento, dirección, cambiar contraseña, y el plan (BillingCard).
  2. **Tiendas**: solo tarjetas de tiendas + botón **Crear tienda**
     (modal): nombre, descripción, logo, **banner** (6 predefinidos:
     comidas, ropa, tecnología, deportes, finanzas, belleza — o subir uno
     propio), horario, solo domicilio / también recogida, teléfono,
     responsable y documento (con «usar los datos de mi cuenta»).
     Tarjeta de tienda con SOLO 3 botones: **Activar pagos con tarjeta ·
     Editar · Eliminar**.
  3. **Productos** (globales): botón **Crear producto** (modal): foto,
     nombre, **precio real a cobrar**, precio de comparación (opcional,
     calcula el % automático), stock (número | agotado | siempre
     disponible), recomendado, ocultar, y tienda a la que pertenece
     (preseleccionada si solo hay una). Lista filtrable por tienda con
     ventas por producto y acciones editar/eliminar/ocultar/destacar.

## 5. Estados de pedido (ciclo completo)

`pending` (sin pagar) → `paid` (entrante) → `preparing` → `ready`
(en reparto / listo recogida) → `delivered` · `cancelled` (con motivo).
Timestamps por fase (acceptedAt, readyAt, deliveredAt) para los contadores.
