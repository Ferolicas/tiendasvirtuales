import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vendi — Tu tienda online",
    short_name: "Vendi",
    description:
      "Crea tu tienda online en minutos: catálogo, pedidos en tiempo real y pagos integrados.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#1c1917",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
