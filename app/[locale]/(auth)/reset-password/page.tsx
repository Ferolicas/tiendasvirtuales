"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/password-input";

function ResetForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.get("password") }),
    });
    setStatus(res.ok ? "done" : "error");
  }

  return (
    <Card className="w-full max-w-sm rounded-3xl shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl tracking-tight">
          {t("resetTitle")}
        </CardTitle>
        <CardDescription>{t("resetSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "done" ? (
          <div className="grid gap-4">
            <p className="animate-fade-in text-sm font-medium text-green-600">
              {t("resetSuccess")}
            </p>
            <Button asChild className="rounded-full">
              <Link href="/login">{t("backToLogin")}</Link>
            </Button>
          </div>
        ) : (
          <form method="post" onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">{t("newPassword")}</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            {status === "error" ? (
              <p className="text-sm text-destructive">{t("resetError")}</p>
            ) : null}
            <Button
              type="submit"
              disabled={status === "saving"}
              className="rounded-full"
            >
              {status === "saving" ? t("resetLoading") : t("resetButton")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-24">
      <Suspense>
        <ResetForm />
      </Suspense>
    </main>
  );
}
