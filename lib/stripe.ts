import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!stripeConfigured()) {
    throw new Error("STRIPE_SECRET_KEY no está configurada");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }
  return _stripe;
}
