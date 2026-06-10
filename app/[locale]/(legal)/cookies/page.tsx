import { getLocale } from "next-intl/server";
import { LegalShell } from "@/components/shared/legal-page";

export const metadata = { title: "Cookies" };

export default async function CookiesPage() {
  const locale = await getLocale();

  if (locale === "en") {
    return (
      <LegalShell title="Cookie policy" updated="Last updated: June 2026">
        <h2>Cookies we use</h2>
        <p>
          Vendi only uses technical cookies that are strictly necessary to
          provide the service. Because of this, no consent banner is
          required.
        </p>
        <ul>
          <li>
            Session cookie (authjs.session-token): keeps your session open in
            the dashboard.
          </li>
          <li>Locale cookie: remembers your language preference.</li>
          <li>
            Cloudflare Turnstile may set technical cookies to distinguish
            humans from bots on forms.
          </li>
        </ul>
        <h2>Analytics</h2>
        <p>
          Our analytics are cookie-less and do not identify you personally.
        </p>
        <h2>How to disable cookies</h2>
        <p>
          You can block or delete cookies in your browser settings, although
          the dashboard sign-in will stop working without the session cookie.
        </p>
      </LegalShell>
    );
  }

  return (
    <LegalShell
      title="Política de cookies"
      updated="Última actualización: junio 2026"
    >
      <h2>Cookies que usamos</h2>
      <p>
        Vendi solo utiliza cookies técnicas estrictamente necesarias para
        prestar el servicio. Por ello no se requiere banner de
        consentimiento.
      </p>
      <ul>
        <li>
          Cookie de sesión (authjs.session-token): mantiene tu sesión abierta
          en el panel.
        </li>
        <li>Cookie de idioma: recuerda tu preferencia de idioma.</li>
        <li>
          Cloudflare Turnstile puede establecer cookies técnicas para
          distinguir humanos de bots en los formularios.
        </li>
      </ul>
      <h2>Analítica</h2>
      <p>
        Nuestra analítica funciona sin cookies y no te identifica
        personalmente.
      </p>
      <h2>Cómo desactivar las cookies</h2>
      <p>
        Puedes bloquear o eliminar las cookies desde la configuración de tu
        navegador, aunque el acceso al panel dejará de funcionar sin la
        cookie de sesión.
      </p>
    </LegalShell>
  );
}
