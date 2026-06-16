"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { CreditCard, LogOut, Store, User } from "lucide-react";
import { Link } from "@/i18n/navigation";

// Menú de avatar del vendedor: lo importante (Pedidos/Productos) vive en las
// pestañas; el resto (perfil/datos+suscripción, tiendas, activar pagos) aquí.
export function VendorMenu({
  name,
  needsPayments,
}: {
  name: string;
  needsPayments?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={name}
        className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
      >
        {initial}
      </button>
      {open ? (
        <div className="animate-fade-in absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border bg-card shadow-soft">
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-bold tracking-tight">{name}</p>
          </div>
          <MenuLink href="/dashboard" icon={User} label="Mi perfil" />
          <MenuLink href="/dashboard/stores" icon={Store} label="Tiendas" />
          {needsPayments ? (
            <MenuLink
              href="/dashboard/stores"
              icon={CreditCard}
              label="Activar pagos online"
              highlight
            />
          ) : null}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2.5 border-t px-4 py-2.5 text-sm font-medium text-destructive hover:bg-secondary"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  highlight,
}: {
  href: string;
  icon: typeof User;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-secondary ${
        highlight ? "text-brand" : ""
      }`}
    >
      <Icon
        className={`size-4 ${highlight ? "text-brand" : "text-muted-foreground"}`}
      />
      {label}
    </Link>
  );
}
