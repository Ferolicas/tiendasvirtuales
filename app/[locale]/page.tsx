import {
  ArrowRight,
  Bell,
  Check,
  Compass,
  CreditCard,
  Globe,
  Package,
  Store,
  Truck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { InstallAppButton } from "@/components/shared/install-app-button";
import { Reveal } from "@/components/shared/reveal";
import { VendiDot } from "@/components/shared/vendi-dot";

export default async function HomePage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  const steps = [
    { icon: Store, title: t("step1Title"), text: t("step1Text") },
    { icon: Package, title: t("step2Title"), text: t("step2Text") },
    { icon: CreditCard, title: t("step3Title"), text: t("step3Text") },
  ];

  const features = [
    { icon: Bell, title: t("feature1Title"), text: t("feature1Text") },
    { icon: CreditCard, title: t("feature2Title"), text: t("feature2Text") },
    { icon: Truck, title: t("feature3Title"), text: t("feature3Text") },
    { icon: Globe, title: t("feature4Title"), text: t("feature4Text") },
  ];

  const freeFeatures = [
    t("freeFeature1"),
    t("freeFeature2"),
    t("freeFeature3"),
    t("freeFeature4"),
  ];
  const proFeatures = [
    t("proFeature1"),
    t("proFeature2"),
    t("proFeature3"),
    t("proFeature4"),
  ];

  return (
    <main className="flex-1">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
          <span className="text-xl font-extrabold tracking-tight">
            vendi<span className="text-brand">.</span>
          </span>
          <nav className="flex items-center gap-1.5 sm:gap-3">
            {/* Explorar tiendas: en móvil, icono + "Tiendas" */}
            <Button variant="ghost" size="sm" asChild className="sm:hidden">
              <Link href="/explorar">
                <Compass className="size-4" />
                {t("exploreShort")}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden sm:inline-flex"
            >
              <Link href="/explorar">{t("exploreLink")}</Link>
            </Button>
            <ThemeToggle />
            {/* Escritorio: iniciar sesión + crear tienda */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden sm:inline-flex"
            >
              <Link href="/login">{tc("login")}</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="hidden rounded-full px-4 sm:inline-flex"
            >
              <Link href="/register">{tc("register")}</Link>
            </Button>
            {/* Móvil: el botón destacado es iniciar sesión */}
            <Button size="sm" asChild className="rounded-full px-4 sm:hidden">
              <Link href="/login">{tc("login")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero — suizo: peso 800 enorme contra peso 300, espacio y un punto */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        />
        <div className="mx-auto max-w-5xl px-5 pb-24 pt-20 text-center sm:px-6 sm:pb-32 sm:pt-28">
          <Reveal>
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
              <VendiDot pulse className="size-1.5" />
              vendi {tc("byOlcas")}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mx-auto max-w-4xl text-[clamp(2.9rem,9vw,6.75rem)] font-extrabold leading-[0.98] tracking-[-0.035em]">
              {t("heroTitle")}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-8 max-w-2xl text-lg font-light leading-relaxed text-muted-foreground sm:text-2xl">
              {t("heroSubtitle")}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3">
              <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="group h-12 w-full rounded-full px-7 text-base sm:w-auto"
                >
                  <Link href="/register">
                    {t("ctaSeller")}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 w-full rounded-full px-7 text-base sm:w-auto"
                >
                  <Link href="/explorar">{t("ctaCustomer")}</Link>
                </Button>
              </div>
              <InstallAppButton label={t("installApp")} />
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <p className="mt-9 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("trustedBy")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Pasos */}
      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-32">
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="hover-lift h-full rounded-3xl border bg-card p-7 shadow-soft">
                <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <step.icon className="size-5" />
                </div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <VendiDot className="size-1.5" />
                  0{i + 1}
                </p>
                <h3 className="text-lg font-bold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
              {t("featuresTitle")}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 2) * 0.08}>
                <div className="hover-lift flex h-full gap-5 rounded-3xl border bg-card p-7 shadow-soft">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <feature.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm font-light leading-relaxed text-muted-foreground">
                      {feature.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="mx-auto max-w-4xl px-5 py-24 sm:px-6 sm:py-32">
        <Reveal>
          <h2 className="text-center text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            {t("pricingTitle")}
          </h2>
          <p className="mt-4 text-center font-light text-muted-foreground sm:text-lg">
            {t("pricingSubtitle")}
          </p>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {/* Plan Gratis */}
          <Reveal>
            <div className="hover-lift h-full rounded-3xl border bg-card p-8 shadow-soft">
              <h3 className="font-bold">{t("freeName")}</h3>
              <p className="mt-3 text-5xl font-extrabold tracking-[-0.03em]">
                {t("freePrice")}
                <span className="ml-1.5 text-sm font-light text-muted-foreground">
                  {t("freePeriod")}
                </span>
              </p>
              <ul className="mt-7 grid gap-3 text-sm">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                asChild
                className="mt-8 w-full rounded-full"
              >
                <Link href="/register">{t("pricingCta")}</Link>
              </Button>
            </div>
          </Reveal>
          {/* Plan Pro */}
          <Reveal delay={0.08}>
            <div className="hover-lift relative h-full rounded-3xl border-2 border-primary bg-card p-8 shadow-soft">
              <Badge className="absolute -top-3 left-8 rounded-full bg-brand text-brand-foreground">
                {t("proBadge")}
              </Badge>
              <h3 className="font-bold">{t("proName")}</h3>
              <p className="mt-3 text-5xl font-extrabold tracking-[-0.03em]">
                {t("proPrice")}
                <span className="ml-1.5 text-sm font-light text-muted-foreground">
                  {t("proPeriod")}
                </span>
              </p>
              <ul className="mt-7 grid gap-3 text-sm">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full rounded-full">
                <Link href="/register">{t("pricingCta")}</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-6 sm:py-28">
          <Reveal>
            <h2 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
              {t("finalCtaTitle")}
            </h2>
            <p className="mt-4 font-light opacity-80 sm:text-lg">
              {t("finalCtaText")}
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="group mt-9 h-12 rounded-full px-7 text-base"
            >
              <Link href="/register">
                {t("ctaPrimary")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <footer className="grid gap-3 py-10 text-center text-xs text-muted-foreground">
        <nav className="flex items-center justify-center gap-4">
          <Link href="/legal" className="hover:text-foreground">
            {t("footerLegal")}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t("footerPrivacy")}
          </Link>
          <Link href="/cookies" className="hover:text-foreground">
            {t("footerCookies")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("footerTerms")}
          </Link>
          <a href="mailto:vendi@olcas.app" className="hover:text-foreground">
            {t("footerContact")}
          </a>
        </nav>
        <p>
          © {new Date().getFullYear()} Vendi · {tc("byOlcas")}
        </p>
      </footer>
    </main>
  );
}
