import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

// Rutas del panel, con o sin prefijo de idioma.
const PROTECTED = /^\/(en\/)?dashboard(\/|$)/;

// Hosts de la propia plataforma; cualquier otro host es un dominio propio
// de tienda (plan Pro) y se enruta a su escaparate.
const PLATFORM_HOSTS = new Set([
  "vendi.olcas.app",
  "tiendas.olcas.app",
  "localhost",
  "127.0.0.1",
]);

// Caché host→slug (60 s) para no consultar la DB en cada petición.
const domainCache = new Map<string, { slug: string | null; at: number }>();

async function resolveCustomDomain(
  host: string,
  origin: string
): Promise<string | null> {
  const hit = domainCache.get(host);
  if (hit && Date.now() - hit.at < 60_000) return hit.slug;
  let slug: string | null = null;
  try {
    const res = await fetch(
      `${origin}/api/domain-resolve?host=${encodeURIComponent(host)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const data = (await res.json()) as { slug?: string };
      slug = data.slug ?? null;
    }
  } catch {
    // si la resolución falla se trata como dominio desconocido
  }
  domainCache.set(host, { slug, at: Date.now() });
  return slug;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dominios propios: todo el tráfico va al escaparate de su tienda.
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (host && !PLATFORM_HOSTS.has(host)) {
    const slug = await resolveCustomDomain(host, req.nextUrl.origin);
    if (slug) {
      const target =
        pathname === "/legal"
          ? `/es/s/${slug}/legal`
          : `/es/s/${slug}`;
      const url = new URL(target, req.url);
      url.search = req.nextUrl.search;
      return NextResponse.rewrite(url);
    }
    return NextResponse.redirect("https://vendi.olcas.app");
  }

  if (PROTECTED.test(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
    if (!token) {
      const prefix = pathname.startsWith("/en") ? "/en" : "";
      const url = new URL(`${prefix}/login`, req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return intl(req);
}

export const config = {
  // Excluye API, assets de Next, archivos con extensión y las rutas de
  // metadata sin extensión (opengraph-image, icon, etc.).
  matcher: ["/((?!api|_next|_vercel|opengraph-image|twitter-image|icon|apple-icon|.*\\..*).*)"],
};
