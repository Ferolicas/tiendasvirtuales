import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import type { StoreHoursRow } from "@/lib/schedule";

export const planEnum = pgEnum("plan", ["free", "pro"]);
// Ciclo de vida v2: pending (sin pagar) → paid (entrante) → preparing →
// ready (en reparto / listo para recoger) → delivered. "shipped" es legado
// de v1 y se trata como delivered en la UI.
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "preparing",
  "ready",
  "delivered",
  // archived: pendiente de pago que el dueño descarta del contador sin
  // considerarlo una cancelación; no aparece en ninguna pestaña.
  "archived",
  "shipped",
  "cancelled",
]);

export const fulfillmentEnum = pgEnum("fulfillment", ["delivery", "pickup"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "in_store",
]);

export const tokenTypeEnum = pgEnum("token_type", [
  "email_verify",
  "password_reset",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Perfil de la pestaña «Datos y suscripción» (reutilizable al crear tiendas)
  phone: text("phone"),
  taxId: text("tax_id"),
  address: text("address"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  // Suscripción de la plataforma: el plan vive en el usuario (Pro desbloquea
  // tiendas/productos ilimitados en toda la cuenta).
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  // Vendi Pro por Mercado Pago (pago manual mensual): hasta cuándo es Pro.
  // Un cron diario degrada a free cuando vence.
  proUntil: timestamp("pro_until", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Hash SHA-256 del token; el token en claro solo viaja en el email.
  tokenHash: text("token_hash").notNull().unique(),
  type: tokenTypeEnum("type").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  // Categoría del negocio (12, estilo Shopify): personaliza el copy del
  // tracking, la comanda y los emails según el vertical (comida vs resto).
  storeCategory: text("store_category"),
  logoUrl: text("logo_url"),
  // Cabecera estilo Uber Eats: banner (predefinido por categoría o subido),
  // horario, teléfono y dirección visibles, y recogida en tienda opcional.
  bannerUrl: text("banner_url"),
  bannerPreset: text("banner_preset"),
  schedule: text("schedule"),
  phone: text("phone"),
  address: text("address"),
  // Ubicación para el marketplace: ciudad (filtro) y coordenadas
  // opcionales (orden por cercanía).
  city: text("city"),
  // País ISO 3166-1 alfa-2: avisos de festivos en Explorar.
  country: text("country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // Horario estructurado [{days, open, close}]; `schedule` guarda el texto
  // generado para mostrar (y como legado de tiendas antiguas).
  hours: jsonb("hours").$type<StoreHoursRow[] | null>(),
  // Formato de hora preferido para mostrar el horario: "24h" o "12h"
  // (AM/PM, habitual en Colombia y LatAm).
  timeFormat: text("time_format").notNull().default("24h"),
  pickupEnabled: boolean("pickup_enabled").notNull().default(false),
  // Media de reseñas desnormalizada para la cabecera
  ratingSum: integer("rating_sum").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  currency: text("currency").notNull().default("EUR"),
  shippingCents: integer("shipping_cents").notNull().default(0),
  // Dominio propio (plan Pro): apunta por DNS al VPS y Caddy emite el SSL
  // bajo demanda. domainVerifiedAt marca cuándo se comprobó el DNS.
  customDomain: text("custom_domain").unique(),
  domainVerifiedAt: timestamp("domain_verified_at", { withTimezone: true }),
  // Datos legales del comerciante para la página legal autogenerada de la
  // tienda (aviso legal + devoluciones).
  legalName: text("legal_name"),
  legalTaxId: text("legal_tax_id"),
  legalAddress: text("legal_address"),
  contactEmail: text("contact_email"),
  plan: planEnum("plan").notNull().default("free"),
  stripeAccountId: text("stripe_account_id"),
  // Solo true cuando Stripe confirma que la cuenta puede cobrar de verdad
  // (charges_enabled); tener stripeAccountId NO significa activado.
  chargesEnabled: boolean("charges_enabled").notNull().default(false),
  // Mercado Pago (Colombia): la tienda vincula su cuenta por OAuth y Vendi
  // cobra en su nombre reteniendo su comisión (marketplace_fee). Reemplaza a
  // Stripe Connect para el cobro de las tiendas; Stripe se mantiene solo para
  // la suscripción Pro de la plataforma. Los tokens son server-only.
  mpUserId: text("mp_user_id"),
  mpAccessToken: text("mp_access_token"),
  mpRefreshToken: text("mp_refresh_token"),
  mpPublicKey: text("mp_public_key"),
  mpTokenExpiresAt: timestamp("mp_token_expires_at", { withTimezone: true }),
  // Solo true cuando la tienda completó el OAuth y tiene tokens válidos.
  mpConnected: boolean("mp_connected").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  description: text("description"),
  // priceCents es SIEMPRE lo que cobra Stripe; compareAtCents solo pinta
  // el precio tachado y el badge de descuento.
  priceCents: integer("price_cents").notNull(),
  compareAtCents: integer("compare_at_cents"),
  imageUrl: text("image_url"),
  stock: integer("stock").notNull().default(0),
  unlimitedStock: boolean("unlimited_stock").notNull().default(true),
  recommended: boolean("recommended").notNull().default(false),
  salesCount: integer("sales_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Número secuencial único para contabilidad e inventario.
  orderNumber: integer("order_number")
    .notNull()
    .generatedAlwaysAsIdentity(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  fulfillment: fulfillmentEnum("fulfillment").notNull().default("delivery"),
  deliveryAddress: text("delivery_address"),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("card"),
  totalCents: integer("total_cents").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  cancelReason: text("cancel_reason"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  // ID del pago en Mercado Pago (cobro de la tienda vía marketplace).
  mpPaymentId: text("mp_payment_id"),
  // Timestamps por fase: contadores de la comanda y métricas de cocina.
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  readyAt: timestamp("ready_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Suscripciones Web Push de los dueños (avisos de pedidos nuevos).
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  customerName: text("customer_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

export type User = typeof users.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
