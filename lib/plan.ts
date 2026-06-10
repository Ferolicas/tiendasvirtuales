// Límites y comisiones por plan (decididos en docs/DECISIONES.md).
export const PLAN_LIMITS = {
  free: { stores: 1, productsPerStore: 10, feePercent: 3 },
  pro: { stores: Infinity, productsPerStore: Infinity, feePercent: 1 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function feeFor(plan: Plan, totalCents: number): number {
  return Math.round((totalCents * PLAN_LIMITS[plan].feePercent) / 100);
}
