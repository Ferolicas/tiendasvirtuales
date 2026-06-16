import { CreditCard, ShieldCheck } from "lucide-react";

export default function MetodosPagoPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Métodos de pago</h1>
      <div className="grid gap-4 rounded-3xl border bg-card p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-green-600" />
          <div>
            <p className="font-bold tracking-tight">
              Pagos seguros con Mercado Pago
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Al pagar eliges <strong>PSE, Nequi o tarjeta</strong> en la
              pasarela de Mercado Pago. No guardamos los datos de tu tarjeta:
              los gestiona Mercado Pago de forma segura.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Elegirás tu método en cada compra, en el momento del pago.
          </p>
        </div>
      </div>
    </div>
  );
}
