"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DangerZone() {
  const t = useTranslations("dashboard");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
      return;
    }
    setDeleting(false);
    setConfirming(false);
  }

  return (
    <Card className="max-w-md rounded-3xl border-destructive/30">
      <CardHeader>
        <CardTitle className="tracking-tight text-destructive">
          {t("dangerTitle")}
        </CardTitle>
        <CardDescription>{t("dangerText")}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        {confirming ? (
          <>
            <span className="text-sm font-medium">{t("deleteConfirm")}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-full"
            >
              {deleting ? t("deleting") : t("deleteAccount")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="rounded-full"
            >
              ✕
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/5"
          >
            {t("deleteAccount")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
