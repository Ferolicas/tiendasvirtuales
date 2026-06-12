// Monedas soportadas y derivación automática según el país de la tienda.
// Al elegir país en el panel, la moneda se fija sola (CO → COP, MX → MXN…).
export const SUPPORTED_CURRENCIES = [
  "EUR",
  "USD",
  "COP",
  "MXN",
  "ARS",
  "BRL",
  "CLP",
  "PEN",
  "UYU",
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const EUROZONE = [
  "ES", "PT", "FR", "DE", "IT", "IE", "NL", "BE", "AT", "FI", "GR",
  "LU", "SI", "SK", "EE", "LV", "LT", "CY", "MT", "HR", "AD", "MC", "SM",
];

const BY_COUNTRY: Record<string, Currency> = {
  CO: "COP",
  MX: "MXN",
  AR: "ARS",
  BR: "BRL",
  CL: "CLP",
  PE: "PEN",
  UY: "UYU",
  US: "USD",
  EC: "USD",
  PA: "USD",
  SV: "USD",
  PR: "USD",
  ...Object.fromEntries(EUROZONE.map((c) => [c, "EUR" as Currency])),
};

export function currencyForCountry(
  country?: string | null
): Currency | null {
  if (!country) return null;
  return BY_COUNTRY[country.toUpperCase()] ?? null;
}
