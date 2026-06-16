import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CustomerMenu } from "@/components/shared/customer-menu";

// Panel del cliente (comprador): perfil, pedidos y métodos de pago. Solo para
// cuentas con rol customer; los vendedores van a su panel.
export default async function ClienteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "customer") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link
            href="/explorar"
            className="text-xl font-extrabold tracking-tight"
          >
            vendi<span className="text-brand">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <CustomerMenu name={session.user.name ?? ""} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
