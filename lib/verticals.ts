// Categorías de tienda (estilo Shopify) y su «vertical» de experiencia:
// el copy del tracking/comanda/emails cambia según el tipo de negocio
// (una tienda de ropa no tiene cocina).

export const STORE_CATEGORIES = [
  "moda",
  "hogar",
  "belleza",
  "alimentacion",
  "deportes",
  "electronica",
  "juguetes",
  "mascotas",
  "arte",
  "salud",
  "libros",
  "digitales",
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number];
export type Vertical = "food" | "digital" | "general";

export function verticalFor(category: string | null): Vertical {
  if (category === "alimentacion") return "food";
  if (category === "digitales") return "digital";
  return "general";
}

// Banner predefinido sugerido cuando el dueño no elige uno.
export const CATEGORY_BANNER: Record<StoreCategory, string> = {
  moda: "ropa",
  hogar: "finanzas",
  belleza: "belleza",
  alimentacion: "comidas",
  deportes: "deportes",
  electronica: "tecnologia",
  juguetes: "deportes",
  mascotas: "comidas",
  arte: "ropa",
  salud: "belleza",
  libros: "finanzas",
  digitales: "tecnologia",
};
