import {
  ArrowRight,
  Bell,
  Check,
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
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

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
          <span className="text-xl font-bold tracking-tight">
            vendi<span className="text-brand">.</span>
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <LocaleSwitcher />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/login">{tc("login")}</Link>
            </Button>
            <Button size="sm" asChild className="rounded-full px-4">
              <Link href="/register">{tc("register")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.955_0.02_30)_0%,transparent_70%)]"
        />
        <div className="mx-auto max-w-4xl px-5 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28">
          <p className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            vendi<span className="-mx-1 text-brand">.</span> {tc("byOlcas")}
          </p>
          <h1 className="animate-fade-up text-[2.6rem] font-bold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl md:text-7xl">
            {t("heroTitle")}
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base text-muted-foreground [animation-delay:160ms] sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
            <Button size="lg" asChild className="group h-12 w-full rounded-full px-7 text-base sm:w-auto">
              <Link href="/register">
                {t("ctaPrimary")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 w-full rounded-full px-7 text-base sm:w-auto"
            >
              <Link href="/login">{t("ctaSecondary")}</Link>
            </Button>
          </div>
          <p className="animate-fade-up mt-8 text-xs text-muted-foreground [animation-delay:320ms]">
            {t("trustedBy")}
          </p>
        </div>
      </section>

      {/* Pasos */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="hover-lift rounded-3xl border bg-card p-7 shadow-soft"
            >
              <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <step.icon className="size-5" />
              </div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand">
                0{i + 1}
              </p>
              <h3 className="text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <h2 className="mx-auto max-w-xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {t("featuresTitle")}
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="hover-lift flex gap-5 rounded-3xl border bg-card p-7 shadow-soft"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <feature.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-6 sm:py-28">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          {t("pricingTitle")}
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          {t("pricingSubtitle")}
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {/* Plan Gratis */}
          <div className="hover-lift rounded-3xl border bg-card p-8 shadow-soft">
            <h3 className="font-semibold">{t("freeName")}</h3>
            <p className="mt-3 text-4xl font-bold tracking-tight">
              {t("freePrice")}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
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
            <Button variant="outline" asChild className="mt-8 w-full rounded-full">
              <Link href="/register">{t("pricingCta")}</Link>
            </Button>
          </div>
          {/* Plan Pro */}
          <div className="hover-lift relative rounded-3xl border-2 border-primary bg-card p-8 shadow-soft">
            <Badge className="absolute -top-3 left-8 rounded-full bg-brand text-brand-foreground">
              {t("proBadge")}
            </Badge>
            <h3 className="font-semibold">{t("proName")}</h3>
            <p className="mt-3 text-4xl font-bold tracking-tight">
              {t("proPrice")}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
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
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-6 sm:py-24">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("finalCtaTitle")}
          </h2>
          <p className="mt-3 opacity-80">{t("finalCtaText")}</p>
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="group mt-8 h-12 rounded-full px-7 text-base"
          >
            <Link href="/register">
              {t("ctaPrimary")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
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
        </nav>
        <p>
          © {new Date().getFullYear()} Vendi · {tc("byOlcas")}
        </p>
      </footer>
    </main>
  );
}
