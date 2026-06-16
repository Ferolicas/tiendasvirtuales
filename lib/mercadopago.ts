import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Cobro de las tiendas (Colombia) con el modelo marketplace de Mercado Pago:
// cada tienda vincula su cuenta por OAuth y Vendi cobra en su nombre reteniendo
// su comisión (`marketplace_fee`). Es el equivalente a Stripe Connect, pero con
// PSE. Las credenciales de plataforma (MP_CLIENT_*) solo se usan para el flujo
// OAuth; el cobro real se hace SIEMPRE con el access_token de cada vendedor.

const AUTH_URL = "https://auth.mercadopago.com/authorization";
const TOKEN_URL = "https://api.mercadopago.com/oauth/token";

export function mpConfigured(): boolean {
  return Boolean(process.env.MP_CLIENT_ID && process.env.MP_CLIENT_SECRET);
}

// Token de la cuenta PROPIA de Vendi: se usa para cobrar la suscripción Pro a
// los dueños (ingreso de Vendi, NO un split) y para leer esos pagos.
export function mpPlatformConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

export function mpPlatformToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no está configurada");
  return token;
}

export function mpRedirectUri(): string {
  return (
    process.env.MP_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/mp/oauth/callback`
  );
}

// URL a la que enviamos a la tienda para autorizar a Vendi (su "onboarding").
// `state` viaja firmado (ver lib/mp-state) para saber qué tienda vuelve en el
// callback y prevenir CSRF.
export function mpAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: String(process.env.MP_CLIENT_ID),
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: mpRedirectUri(),
  });
  return `${AUTH_URL}?${params}`;
}

export type MpTokens = {
  access_token: string;
  refresh_token: string;
  user_id: number;
  public_key: string;
  expires_in: number; // segundos (~15 552 000 = 180 días)
};

// Intercambia el `code` del callback por los tokens de la tienda.
export function mpExchangeCode(code: string): Promise<MpTokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: mpRedirectUri(),
  });
}

// Renueva el access_token con el refresh_token antes de que caduque (180 días).
export function mpRefresh(refreshToken: string): Promise<MpTokens> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function tokenRequest(extra: Record<string, string>): Promise<MpTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...extra,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<MpTokens> & {
    message?: string;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `MP OAuth ${res.status}: ${data.error ?? data.message ?? "sin detalle"}`
    );
  }
  return data as MpTokens;
}

// Cliente del SDK apuntando a la cuenta de una tienda concreta (su token).
function clientFor(accessToken: string): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken });
}

// El cuerpo de preferencia que espera el SDK (lo derivamos del método para no
// acoplarnos a rutas internas del paquete ni usar `any`).
export type MpPreferenceBody = Parameters<Preference["create"]>[0]["body"];

// Crea una preferencia de Checkout Pro en la cuenta de la tienda, con la
// comisión de Vendi (`marketplace_fee`). OJO: los importes van en unidades de
// la moneda (pesos), NO en céntimos; convertir (cents/100) antes de llamar.
export function mpCreatePreference(accessToken: string, body: MpPreferenceBody) {
  return new Preference(clientFor(accessToken)).create({ body });
}

// Consulta un pago en la cuenta de la tienda (lo usa el webhook para confirmar).
export function mpGetPayment(accessToken: string, paymentId: string) {
  return new Payment(clientFor(accessToken)).get({ id: paymentId });
}
