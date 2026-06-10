import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "TiendasVirtuales — Crea tu tienda online en minutos",
    template: "%s | TiendasVirtuales",
  },
  description:
    "Plataforma para crear tiendas virtuales para cualquier tipo de negocio: catálogo, pedidos en tiempo real y pagos integrados.",
  openGraph: {
    title: "TiendasVirtuales",
    description:
      "Crea tu tienda online en minutos. Catálogo, pedidos en tiempo real y pagos integrados.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
