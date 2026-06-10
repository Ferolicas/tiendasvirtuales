import { getLocale } from "next-intl/server";
import { LegalShell } from "@/components/shared/legal-page";

export const metadata = { title: "Términos · Terms" };

export default async function TermsPage() {
  const locale = await getLocale();

  if (locale === "en") {
    return (
      <LegalShell title="Terms of service" updated="Last updated: June 2026">
        <h2>The service</h2>
        <p>
          Vendi provides tools to create and operate online stores. Merchants
          are responsible for the legality of their products, their prices,
          taxes, shipping and consumer-law obligations towards their buyers.
        </p>
        <h2>Plans and fees</h2>
        <p>
          The Free plan includes 1 store and up to 10 products with a 3% fee
          per sale processed through the platform. The Pro plan (€9.99/month)
          includes unlimited stores and products with a 1% fee. Subscriptions
          renew monthly and can be cancelled anytime from the dashboard; they
          remain active until the end of the paid period.
        </p>
        <h2>Payments</h2>
        <p>
          Card payments are processed by Stripe. Store payouts go directly to
          the merchant's connected Stripe account. Vendi never stores card
          numbers.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Selling illegal goods, counterfeits or content that infringes
          third-party rights is forbidden. Olcas may suspend stores that
          breach these terms or applicable law.
        </p>
        <h2>Termination</h2>
        <p>
          You can delete your account at any time. Olcas may terminate the
          service with reasonable notice; in that case active subscriptions
          will be refunded pro rata.
        </p>
      </LegalShell>
    );
  }

  return (
    <LegalShell
      title="Términos del servicio"
      updated="Última actualización: junio 2026"
    >
      <h2>El servicio</h2>
      <p>
        Vendi ofrece herramientas para crear y operar tiendas online. Los
        comerciantes son responsables de la legalidad de sus productos, sus
        precios, impuestos, envíos y obligaciones de consumo frente a sus
        compradores.
      </p>
      <h2>Planes y comisiones</h2>
      <p>
        El plan Gratis incluye 1 tienda y hasta 10 productos con una comisión
        del 3 % por venta procesada a través de la plataforma. El plan Pro
        (9,99 €/mes) incluye tiendas y productos ilimitados con un 1 % de
        comisión. La suscripción se renueva mensualmente y puede cancelarse
        en cualquier momento desde el panel; permanece activa hasta el final
        del periodo pagado.
      </p>
      <h2>Pagos</h2>
      <p>
        Los pagos con tarjeta los procesa Stripe. Los cobros de cada tienda
        van directamente a la cuenta de Stripe conectada del comerciante.
        Vendi nunca almacena números de tarjeta.
      </p>
      <h2>Uso aceptable</h2>
      <p>
        Está prohibido vender productos ilegales, falsificaciones o contenido
        que infrinja derechos de terceros. Olcas puede suspender las tiendas
        que incumplan estos términos o la ley aplicable.
      </p>
      <h2>Baja</h2>
      <p>
        Puedes eliminar tu cuenta en cualquier momento. Olcas puede cesar el
        servicio con preaviso razonable; en tal caso las suscripciones
        activas se reembolsarán a prorrata.
      </p>
    </LegalShell>
  );
}
