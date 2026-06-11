import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link
            href="/dashboard"
            className="text-lg font-extrabold tracking-tight"
          >
            vendi<span className="text-brand">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="rounded-full"
              >
                {t("logout")}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
