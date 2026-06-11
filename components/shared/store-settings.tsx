"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShippingForm({
  storeId,
  initialShippingCents,
}: {
  storeId: string;
  initialShippingCents: number;
}) {
  const t = useTranslations("dashboard");
  const tToast = useTranslations("toasts");
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingCents: Math.round(Number(form.get("shipping")) * 100),
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

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="shipping">{t("shippingLabel")}</Label>
        <Input
          id="shipping"
          name="shipping"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(initialShippingCents / 100).toFixed(2)}
          required
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
  );
}

export function LegalForm({
  storeId,
  initial,
}: {
  storeId: string;
  initial: {
    legalName: string | null;
    legalTaxId: string | null;
    legalAddress: string | null;
    contactEmail: string | null;
  };
}) {
  const t = useTranslations("dashboard");
  const tToast = useTranslations("toasts");
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalName: form.get("legalName") || undefined,
        legalTaxId: form.get("legalTaxId") || undefined,
        legalAddress: form.get("legalAddress") || undefined,
        contactEmail: form.get("contactEmail") || undefined,
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

  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="legalName">{t("legalNameLabel")}</Label>
        <Input
          id="legalName"
          name="legalName"
          maxLength={200}
          defaultValue={initial.legalName ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="legalTaxId">{t("legalTaxIdLabel")}</Label>
          <Input
            id="legalTaxId"
            name="legalTaxId"
            maxLength={50}
            defaultValue={initial.legalTaxId ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactEmail">{t("contactEmailLabel")}</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={initial.contactEmail ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="legalAddress">{t("legalAddressLabel")}</Label>
        <Input
          id="legalAddress"
          name="legalAddress"
          maxLength={300}
          defaultValue={initial.legalAddress ?? ""}
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
  );
}

export function ConnectButton({
  storeId,
  connected,
}: {
  storeId: string;
  connected: boolean;
}) {
  const t = useTranslations("dashboard");
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function onConnect() {
    setLoading(true);
    const res = await fetch(`/api/stores/${storeId}/connect`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }
    setLoading(false);
    if (res.status === 501) setUnavailable(true);
  }

  if (connected) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-green-600">
        <span className="inline-block size-2 rounded-full bg-green-500" />
        {t("connectActive")}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {unavailable ? (
        <p className="text-sm text-muted-foreground">
          {t("billingUnavailable")}
        </p>
      ) : null}
      <Button
        onClick={onConnect}
        disabled={loading}
        size="sm"
        className="w-fit rounded-full"
      >
        {loading ? t("connectLoading") : t("connectButton")}
      </Button>
    </div>
  );
}
