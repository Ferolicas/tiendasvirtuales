// Verificación server-side de Cloudflare Turnstile. Si la clave secreta no
// está configurada todavía, se permite el paso (la protección se activa al
// añadir TURNSTILE_SECRET_KEY al .env).
export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(
  token: unknown,
  ip: string
): Promise<boolean> {
  if (!turnstileConfigured()) return true;
  if (typeof token !== "string" || !token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: ip,
        }),
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
