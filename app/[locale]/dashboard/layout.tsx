import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stores, users } from "@/lib/db/schema";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { MasterTabs } from "@/components/dashboard/master-tabs";
import { VendorMenu } from "@/components/dashboard/vendor-menu";
import { ProBadge } from "@/components/dashboard/pro-badge";
import { NotificationBell } from "@/components/dashboard/notification-bell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Los clientes no entran al panel de vendedor: a su home (Explorar).
  if (session.user.role === "customer") redirect("/explorar");

  const [[me], unconnected] = await Promise.all([
    db
      .select({ name: users.name, plan: users.plan })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.ownerId, session.user.id),
          isNull(stores.deletedAt),
          eq(stores.mpConnected, false)
        )
      )
      .limit(1),
  ]);
  const name = me?.name ?? session.user.name ?? "";
  const needsPayments = unconnected.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link
            href="/dashboard/orders"
            className="text-lg font-extrabold tracking-tight"
          >
            vendi<span className="text-brand">.</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <NotificationBell />
            {me?.plan === "free" ? <ProBadge /> : null}
            <VendorMenu name={name} needsPayments={needsPayments} />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-6">
        <MasterTabs />
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
