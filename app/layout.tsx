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
    default: "Vendi — Tu tienda online, lista en minutos",
    template: "%s | Vendi",
  },
  description:
    "Vendi by Olcas: crea la tienda online de tu negocio en minutos. Catálogo premium, pedidos en tiempo real y pagos con tarjeta integrados.",
  openGraph: {
    title: "Vendi — Tu tienda online, lista en minutos",
    description:
      "Crea la tienda online de tu negocio en minutos. Catálogo premium, pedidos en tiempo real y pagos integrados.",
    type: "website",
    siteName: "Vendi",
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
