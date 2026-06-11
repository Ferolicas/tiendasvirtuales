"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { PasswordInput } from "@/components/shared/password-input";

export interface AccountProfile {
  email: string;
  name: string;
  phone: string | null;
  taxId: string | null;
  address: string | null;
}

export function AccountPanel({ profile }: { profile: AccountProfile }) {
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("auth");
  const tToast = useTranslations("toasts");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: String(form.get("phone") ?? ""),
        taxId: String(form.get("taxId") ?? ""),
        address: String(form.get("address") ?? ""),
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(tToast("settingsSaved"));
      router.refresh();
    } else {
      toast.error(tToast("settingsFailed"));
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setChanging(true);
    const form = new FormData(formElement);
    const res = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("current"),
        newPassword: form.get("new"),
      }),
    });
    setChanging(false);
    if (res.ok) {
      toast.success(t("passwordChanged"));
      formElement.reset();
    } else if (res.status === 403) {
      toast.error(t("passwordWrong"));
    } else {
      toast.error(tToast("settingsFailed"));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-3xl shadow-soft">
        <CardHeader>
          <CardTitle className="tracking-tight">{t("tabAccount")}</CardTitle>
          <CardDescription>{t("accountEmailHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={saveProfile} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="acc-email">{tAuth("email")}</Label>
              <Input id="acc-email" value={profile.email} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acc-name">{tAuth("name")}</Label>
              <Input
                id="acc-name"
                name="name"
                minLength={2}
                defaultValue={profile.name}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="acc-phone">{t("accountPhone")}</Label>
                <Input
                  id="acc-phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="acc-taxid">{t("accountTaxId")}</Label>
                <Input
                  id="acc-taxid"
                  name="taxId"
                  defaultValue={profile.taxId ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acc-address">{t("accountAddress")}</Label>
              <Input
                id="acc-address"
                name="address"
                defaultValue={profile.address ?? ""}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="w-fit rounded-full"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("saveButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit rounded-3xl shadow-soft">
        <CardHeader>
          <CardTitle className="tracking-tight">{t("passwordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={changePassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pw-current">{t("currentPassword")}</Label>
              <PasswordInput
                id="pw-current"
                name="current"
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pw-new">{t("newPasswordLabel")}</Label>
              <PasswordInput
                id="pw-new"
                name="new"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={changing}
              className="w-fit rounded-full"
            >
              {changing ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {t("saveButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
