import { getLocale } from "next-intl/server";
import { LegalShell } from "@/components/shared/legal-page";

export const metadata = { title: "Privacidad · Privacy" };

export default async function PrivacyPage() {
  const locale = await getLocale();

  if (locale === "en") {
    return (
      <LegalShell title="Privacy policy" updated="Last updated: June 2026">
        <h2>Data controller</h2>
        <p>
          Olcas Apps, tax ID [NIF], [DIRECCIÓN FISCAL], Spain —
          vendi@olcas.app.
        </p>
        <h2>What data we process</h2>
        <ul>
          <li>
            Merchant accounts: name, email and password hash; subscription
            and payment references (Stripe).
          </li>
          <li>
            Buyers: name and email provided when placing an order in a store.
          </li>
          <li>Technical logs (IP, user agent) for security purposes.</li>
        </ul>
        <h2>Purposes and legal basis</h2>
        <p>
          We process data to provide the service (contract), send
          transactional emails such as verification and password reset
          (contract), prevent abuse (legitimate interest) and comply with tax
          obligations (legal obligation).
        </p>
        <h2>Processors</h2>
        <p>
          Stripe (payments), Resend (transactional email) and Cloudflare
          (DNS, anti-bot, image storage) act as processors under their own
          data processing agreements. Data is hosted in the EU where
          possible.
        </p>
        <h2>Retention and deletion</h2>
        <p>
          You can delete your account at any time from the dashboard:
          personal data is anonymized immediately. Order and billing records
          are kept anonymized for the legally required period.
        </p>
        <h2>Your rights</h2>
        <p>
          You may exercise access, rectification, erasure, portability,
          restriction and objection rights by writing to vendi@olcas.app. You
          may also lodge a complaint with the Spanish supervisory authority
          (AEPD).
        </p>
      </LegalShell>
    );
  }

  return (
    <LegalShell
      title="Política de privacidad"
      updated="Última actualización: junio 2026"
    >
      <h2>Responsable del tratamiento</h2>
      <p>
        Olcas Apps, NIF [NIF], [DIRECCIÓN FISCAL], España — vendi@olcas.app.
      </p>
      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          Cuentas de comerciantes: nombre, email y hash de contraseña;
          referencias de suscripción y pago (Stripe).
        </li>
        <li>
          Compradores: nombre y email facilitados al hacer un pedido en una
          tienda.
        </li>
        <li>Registros técnicos (IP, user agent) con fines de seguridad.</li>
      </ul>
      <h2>Finalidades y base jurídica</h2>
      <p>
        Tratamos los datos para prestar el servicio (contrato), enviar emails
        transaccionales como verificación y recuperación de contraseña
        (contrato), prevenir abusos (interés legítimo) y cumplir obligaciones
        fiscales (obligación legal).
      </p>
      <h2>Encargados de tratamiento</h2>
      <p>
        Stripe (pagos), Resend (email transaccional) y Cloudflare (DNS,
        anti-bots, almacenamiento de imágenes) actúan como encargados bajo
        sus propios acuerdos de tratamiento. Los datos se alojan en la UE
        siempre que es posible.
      </p>
      <h2>Conservación y borrado</h2>
      <p>
        Puedes eliminar tu cuenta en cualquier momento desde el panel: los
        datos personales se anonimizan de inmediato. Los registros de pedidos
        y facturación se conservan anonimizados durante el plazo legal.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión,
        portabilidad, limitación y oposición escribiendo a vendi@olcas.app.
        También puedes reclamar ante la AEPD.
      </p>
    </LegalShell>
  );
}
