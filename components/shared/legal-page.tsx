import { Link } from "@/i18n/navigation";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            vendi<span className="text-brand">.</span>
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-6 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:grid [&_ul]:gap-1.5 [&_ul]:pl-5 [&_li]:list-disc [&_li]:text-sm [&_li]:text-muted-foreground">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="!mt-2 text-xs uppercase tracking-wider !text-muted-foreground/70">
          {updated}
        </p>
        {children}
      </article>
    </main>
  );
}
