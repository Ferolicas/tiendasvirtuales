// Limitador en memoria (ventana deslizante). Suficiente para un único proceso
// Node bajo PM2; si la app escala a varios procesos habrá que pasar a Redis.
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 10_000
): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientIdentifier(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
  );
}
