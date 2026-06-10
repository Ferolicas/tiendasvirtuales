import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Next.js 16 renombró middleware.ts a proxy.ts. Protege las rutas del panel:
// sin sesión válida se redirige a /login conservando la URL de destino.
export default async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
