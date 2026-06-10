import { Resend } from "resend";

// Emails transaccionales vía Resend (remitente vendi@olcas.app). Si la API
// key no está configurada todavía, los envíos se omiten sin romper el flujo.
let _resend: Resend | null = null;

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = "Vendi <vendi@olcas.app>";

async function send(to: string, subject: string, html: string) {
  if (!emailConfigured()) {
    console.warn(`[email] RESEND_API_KEY no configurada; omitido: ${subject}`);
    return;
  }
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
  if (error) console.error("[email] error de Resend:", error);
}

function layout(body: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1c1917">
    <p style="font-size:20px;font-weight:700;margin:0 0 24px">vendi<span style="color:#e0563f">.</span></p>
    ${body}
    <p style="font-size:12px;color:#a8a29e;margin-top:32px">Vendi · by Olcas Apps · vendi.olcas.app</p>
  </div>`;
}

export async function sendVerificationEmail(to: string, url: string) {
  await send(
    to,
    "Verifica tu email · Verify your email",
    layout(`
      <h1 style="font-size:18px">Confirma tu dirección de email</h1>
      <p style="font-size:14px;line-height:1.6">Pulsa el botón para verificar tu cuenta de Vendi.<br/>
      <span style="color:#78716c">Click the button to verify your Vendi account.</span></p>
      <a href="${url}" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;margin:16px 0">Verificar · Verify</a>
      <p style="font-size:12px;color:#a8a29e">Si no creaste esta cuenta, ignora este email.<br/>If you didn't create this account, ignore this email.</p>
    `)
  );
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await send(
    to,
    "Restablece tu contraseña · Reset your password",
    layout(`
      <h1 style="font-size:18px">Restablecer contraseña</h1>
      <p style="font-size:14px;line-height:1.6">Pulsa el botón para crear una contraseña nueva. El enlace caduca en 1 hora.<br/>
      <span style="color:#78716c">Click the button to set a new password. The link expires in 1 hour.</span></p>
      <a href="${url}" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;margin:16px 0">Cambiar contraseña · Reset password</a>
      <p style="font-size:12px;color:#a8a29e">Si no lo pediste, ignora este email.<br/>If you didn't request this, ignore this email.</p>
    `)
  );
}

export async function sendAlertEmail(subject: string, text: string) {
  const to = process.env.ALERT_EMAIL;
  if (!to) return;
  await send(to, subject, layout(`<p style="font-size:14px">${text}</p>`));
}
