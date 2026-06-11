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

export interface OrderEmailData {
  storeName: string;
  reference: string;
  lines: { name: string; quantity: number; totalFormatted: string }[];
  shippingFormatted: string | null;
  totalFormatted: string;
  customerName: string;
}

function orderTable(data: OrderEmailData): string {
  const rows = data.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:6px 0;font-size:14px">${line.quantity} × ${line.name}</td>
        <td style="padding:6px 0;font-size:14px;text-align:right">${line.totalFormatted}</td>
      </tr>`
    )
    .join("");
  const shipping = data.shippingFormatted
    ? `<tr><td style="padding:6px 0;font-size:13px;color:#78716c">Envío · Shipping</td><td style="padding:6px 0;font-size:13px;text-align:right;color:#78716c">${data.shippingFormatted}</td></tr>`
    : "";
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${rows}${shipping}
      <tr>
        <td style="padding:10px 0;font-size:15px;font-weight:700;border-top:1px solid #e7e5e4">Total</td>
        <td style="padding:10px 0;font-size:15px;font-weight:700;text-align:right;border-top:1px solid #e7e5e4">${data.totalFormatted}</td>
      </tr>
    </table>`;
}

export async function sendOrderConfirmationEmail(
  to: string,
  data: OrderEmailData
) {
  await send(
    to,
    `Tu pedido en ${data.storeName} · Ref ${data.reference}`,
    layout(`
      <h1 style="font-size:18px">¡Pedido confirmado! · Order confirmed!</h1>
      <p style="font-size:13px;color:#78716c;text-transform:uppercase;letter-spacing:0.1em;margin:4px 0 0">Ref · ${data.reference}</p>
      <p style="font-size:14px;line-height:1.6;margin-top:16px">Hola ${data.customerName}: <strong>${data.storeName}</strong> ha recibido tu pedido y se pondrá en contacto contigo.<br/>
      <span style="color:#78716c">${data.storeName} received your order and will get in touch with you.</span></p>
      ${orderTable(data)}
    `)
  );
}

export async function sendOwnerNewOrderEmail(to: string, data: OrderEmailData) {
  await send(
    to,
    `Nuevo pedido en ${data.storeName} — ${data.totalFormatted}`,
    layout(`
      <h1 style="font-size:18px">Nuevo pedido de ${data.customerName}</h1>
      <p style="font-size:13px;color:#78716c;text-transform:uppercase;letter-spacing:0.1em;margin:4px 0 0">Ref · ${data.reference}</p>
      ${orderTable(data)}
      <a href="https://vendi.olcas.app/dashboard" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px">Ver en el panel</a>
    `)
  );
}

export async function sendAlertEmail(subject: string, text: string) {
  const to = process.env.ALERT_EMAIL;
  if (!to) return;
  await send(to, subject, layout(`<p style="font-size:14px">${text}</p>`));
}
