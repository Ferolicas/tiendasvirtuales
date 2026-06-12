// Cada moneda se formatea con la convención de su país (símbolo y
// separadores). El COP se muestra sin decimales cuando el importe es entero,
// como es habitual en Colombia ($ 12.000 y no $ 12.000,00).
const LOCALE_BY_CURRENCY: Record<string, string> = {
  EUR: "es-ES",
  USD: "en-US",
  COP: "es-CO",
  MXN: "es-MX",
  ARS: "es-AR",
  BRL: "pt-BR",
  CLP: "es-CL",
  PEN: "es-PE",
  UYU: "es-UY",
};

export function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  const wholeCop = currency === "COP" && Number.isInteger(amount);
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] ?? "es-ES", {
    style: "currency",
    currency,
    ...(wholeCop
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : {}),
  }).format(amount);
}
