"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VendiLiveDot } from "@/components/shared/vendi-dot";

const VPS_IP = "87.106.236.248";
// Plantilla del enlace de compra (afiliado configurable): {domain} se
// sustituye por lo que el dueño haya escrito.
const BUY_URL_TEMPLATE =
  process.env.NEXT_PUBLIC_BUY_DOMAIN_URL ??
  "https://www.namecheap.com/domains/registration/results/?domain={domain}";

export function LogoForm({
  storeId,
  initialLogoUrl,
}: {
  storeId: string;
  initialLogoUrl: string | null;
}) {
  const t = useTranslations("dashboard");
  const tToast = useTranslations("toasts");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);

    const body = new FormData();
    body.append("file", file);
    body.append("storeId", storeId);
    body.append("kind", "logo");
    const upload = await fetch("/api/uploads", { method: "POST", body });
    if (!upload.ok) {
      setSaving(false);
      toast.error(t("uploadFailed"));
      return;
    }
    const { url } = await upload.json();

    const res = await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: url }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(tToast("settingsFailed"));
      return;
    }
    setLogoUrl(url);
    toast.success(tToast("settingsSaved"));
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="size-16 rounded-2xl border object-cover"
        />
      ) : (
        <span className="flex size-16 items-center justify-center rounded-2xl border border-dashed bg-accent/50 text-xl font-extrabold text-accent-foreground/60">
          ?
        </span>
      )}
      <div className="grid gap-1.5">
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={onChange}
          disabled={saving}
          className="max-w-60"
        />
        {saving ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>
    </div>
  );
}

export function DomainCard({
  storeId,
  isPro,
  initialDomain,
  initialVerified,
}: {
  storeId: string;
  isPro: boolean;
  initialDomain: string | null;
  initialVerified: boolean;
}) {
  const t = useTranslations("dashboard");
  const [domain, setDomain] = useState(initialDomain);
  const [verified, setVerified] = useState(initialVerified);
  const [input, setInput] = useState(initialDomain ?? "");
  const [busy, setBusy] = useState(false);

  const buyUrl = BUY_URL_TEMPLATE.replace(
    "{domain}",
    encodeURIComponent(input || "")
  );

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/stores/${storeId}/domain`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: input }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(
        data?.error === "domain_taken"
          ? t("domainTaken")
          : data?.error === "plan_limit"
            ? t("domainProOnly")
            : t("domainInvalid")
      );
      return;
    }
    const data = await res.json();
    setDomain(data.domain);
    setVerified(data.verified);
    if (data.verified) toast.success(t("domainVerified"));
  }

  async function verify() {
    setBusy(true);
    const res = await fetch(`/api/stores/${storeId}/domain`, {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) return;
    const data = await res.json();
    setVerified(data.verified);
    if (data.verified) toast.success(t("domainVerified"));
    else toast.info(t("domainNotYet"));
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/stores/${storeId}/domain`, { method: "DELETE" });
    setBusy(false);
    setDomain(null);
    setVerified(false);
    setInput("");
  }

  if (!isPro) {
    return (
      <p className="text-sm text-muted-foreground">{t("domainProOnly")}</p>
    );
  }

  if (domain) {
    return (
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 font-bold tracking-tight">
            {verified ? <VendiLiveDot /> : null}
            {domain}
          </span>
          {verified ? (
            <Badge className="rounded-full bg-green-600/12 text-green-700 dark:bg-green-400/15 dark:text-green-300">
              {t("domainActive")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="rounded-full">
              {t("domainPendingBadge")}
            </Badge>
          )}
        </div>
        {!verified ? (
          <div className="grid gap-1.5 rounded-2xl bg-secondary/60 p-4 text-sm">
            <p className="font-medium">{t("domainInstructions")}</p>
            <p className="font-mono text-xs">
              {t("domainRecordA", { ip: VPS_IP })}
            </p>
            <p className="font-mono text-xs">{t("domainRecordCname")}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!verified ? (
            <Button
              size="sm"
              onClick={verify}
              disabled={busy}
              className="rounded-full"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {busy ? t("domainVerifying") : t("domainVerify")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild className="rounded-full">
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" />
                {domain}
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={remove}
            disabled={busy}
            className="rounded-full text-muted-foreground"
          >
            {t("domainRemove")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={connect} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="custom-domain">{t("domainTitle")}</Label>
        <Input
          id="custom-domain"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("domainPlaceholder")}
          pattern="[a-zA-Z0-9.-]+"
          required
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {t("domainSave")}
        </Button>
        <Button size="sm" variant="outline" asChild className="rounded-full">
          <a href={buyUrl} target="_blank" rel="noopener noreferrer">
            <Globe className="size-3.5" />
            {t("domainBuy")}
          </a>
        </Button>
      </div>
      <p className="text-xs font-light text-muted-foreground">
        {t("domainBuyHint")}
      </p>
    </form>
  );
}

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
