import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Tu catálogo en minutos",
    description:
      "Crea tu tienda, sube tus productos con fotos y compártela con un enlace. Sin programar nada.",
  },
  {
    title: "Pedidos en tiempo real",
    description:
      "Cada venta aparece al instante en tu panel. Sin refrescar, sin esperar correos.",
  },
  {
    title: "Cobros integrados",
    description:
      "Acepta pagos con tarjeta mediante Stripe y recibe el dinero directamente en tu cuenta.",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            Tiendas<span className="text-primary">Virtuales</span>
          </span>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Crear mi tienda</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Crea la tienda online de tu negocio en minutos
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Para cualquier tipo de negocio: restaurantes, moda, artesanía,
          servicios. Catálogo, pedidos en tiempo real y pagos con tarjeta,
          todo en un solo sitio.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Empezar gratis</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} TiendasVirtuales · olcas.app
      </footer>
    </main>
  );
}
