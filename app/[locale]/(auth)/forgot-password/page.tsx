"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-24">
      <Card className="w-full max-w-sm rounded-3xl shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">
            {t("forgotTitle")}
          </CardTitle>
          <CardDescription>{t("forgotSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="grid gap-4">
              <p className="animate-fade-in text-sm text-muted-foreground">
                {t("forgotSent")}
              </p>
              <Button variant="outline" asChild className="rounded-full">
                <Link href="/login">{t("backToLogin")}</Link>
              </Button>
            </div>
          ) : (
            <form method="post" onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-full"
              >
                {loading ? t("forgotLoading") : t("forgotButton")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
