import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Firma el `state` del OAuth de Mercado Pago. Lleva el storeId (para saber qué
// tienda vuelve en el callback), un timestamp y un nonce, todo firmado con
// AUTH_SECRET para que no se pueda falsificar (anti-CSRF). Caduca a los 10 min.
const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está configurada");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signState(storeId: string): string {
  const payload = `${storeId}.${Date.now()}.${randomBytes(8).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

// Devuelve el storeId si el state es válido y no ha caducado; si no, null.
export function verifyState(state: string): string | null {
  const i = state.lastIndexOf(".");
  if (i < 0) return null;
  const payload = state.slice(0, i);
  const sig = state.slice(i + 1);

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [storeId, ts] = payload.split(".");
  if (!storeId || !ts) return null;
  if (Date.now() - Number(ts) > TTL_MS) return null;
  return storeId;
}
