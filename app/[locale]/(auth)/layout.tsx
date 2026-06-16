import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            vendi<span className="text-brand">.</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
