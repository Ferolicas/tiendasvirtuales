"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Turnstile } from "@/components/shared/turnstile";
import { VendiDot } from "@/components/shared/vendi-dot";
import { formatPrice } from "@/lib/format";

export interface StorefrontStore {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  shippingCents: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  stock: number;
}

// ── Carrito (contexto + persistencia por tienda) ─────────────────────────
interface CartContextValue {
  items: Map<string, number>;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera de CartProvider");
  return ctx;
}

function ProductImage({
  product,
  sizes,
}: {
  product: StorefrontProduct;
  sizes: string;
}) {
  if (product.imageUrl) {
    return (
      <Image
        src={product.imageUrl}
        alt={product.name}
        fill
        sizes={sizes}
        className="object-cover"
      />
    );
  }
  return (
    <div className="flex size-full items-center justify-center bg-accent">
      <StoreIcon className="size-8 text-accent-foreground/50" />
    </div>
  );
}

// ── Escaparate ───────────────────────────────────────────────────────────
export function Storefront({
  store,
  products,
}: {
  store: StorefrontStore;
  products: StorefrontProduct[];
}) {
  const t = useTranslations("store");
  const tEmpty = useTranslations("empty");
  const storageKey = `vendi-cart-${store.id}`;

  const [items, setItems] = useState<Map<string, number>>(new Map());
  const [hydrated, setHydrated] = useState(false);
  const [detail, setDetail] = useState<StorefrontProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const entries = JSON.parse(raw) as [string, number][];
        // Solo productos que sigan existiendo y con stock vigente.
        const valid = entries.filter(([id]) => productById.has(id));
        setItems(new Map(valid));
      }
    } catch {
      // carrito corrupto: se ignora
    }
    setHydrated(true);
  }, [storageKey, productById]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify([...items.entries()]));
  }, [items, hydrated, storageKey]);

  const cart: CartContextValue = useMemo(() => {
    const clamp = (productId: string, quantity: number) => {
      const stock = productById.get(productId)?.stock ?? 0;
      return Math.max(0, Math.min(quantity, stock, 99));
    };
    return {
      items,
      add: (productId, quantity = 1) =>
        setItems((prev) => {
          const next = new Map(prev);
          const value = clamp(productId, (next.get(productId) ?? 0) + quantity);
          if (value > 0) next.set(productId, value);
          return next;
        }),
      setQuantity: (productId, quantity) =>
        setItems((prev) => {
          const next = new Map(prev);
          const value = clamp(productId, quantity);
          if (value === 0) next.delete(productId);
          else next.set(productId, value);
          return next;
        }),
      remove: (productId) =>
        setItems((prev) => {
          const next = new Map(prev);
          next.delete(productId);
          return next;
        }),
      clear: () => setItems(new Map()),
      count: [...items.values()].reduce((a, b) => a + b, 0),
    };
  }, [items, productById]);

  return (
    <CartContext.Provider value={cart}>
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        {products.length === 0 ? (
          <EmptyState
            icon={StoreIcon}
            title={tEmpty("catalogTitle")}
            hint={tEmpty("catalogHint")}
            className="mx-auto max-w-md"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={store.currency}
                onOpen={() => setDetail(product)}
              />
            ))}
          </div>
        )}
      </section>

      <ProductDetailDrawer
        product={detail}
        currency={store.currency}
        onClose={() => setDetail(null)}
        onAdded={() => {
          setDetail(null);
          setCartOpen(true);
        }}
      />

      <CartButton onOpen={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
        productById={productById}
      />
    </CartContext.Provider>
  );
}

// ── Tarjeta de producto ──────────────────────────────────────────────────
function ProductCard({
  product,
  currency,
  onOpen,
}: {
  product: StorefrontProduct;
  currency: string;
  onOpen: () => void;
}) {
  const t = useTranslations("store");
  const cart = useCart();
  const soldOut = product.stock <= 0;
  const inCart = cart.items.get(product.id) ?? 0;
  const canAdd = !soldOut && inCart < product.stock;

  return (
    <div className="hover-lift group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-square w-full overflow-hidden text-left"
        aria-label={product.name}
      >
        <ProductImage
          product={product}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
        />
        {soldOut ? (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/80 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-background backdrop-blur-sm">
            {t("outOfStock")}
          </span>
        ) : product.stock <= 5 ? (
          <Badge className="absolute left-3 top-3 rounded-full bg-brand text-brand-foreground">
            {t("lowStock", { count: product.stock })}
          </Badge>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <button type="button" onClick={onOpen} className="text-left">
          <p className="font-bold tracking-tight">{product.name}</p>
          {product.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs font-light text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="font-extrabold tracking-tight">
            {formatPrice(product.priceCents, currency)}
          </p>
          <Button
            size="sm"
            disabled={!canAdd}
            onClick={() => {
              cart.add(product.id);
              toast.success(t("addedToCart"));
            }}
            className="rounded-full"
          >
            <Plus className="size-3.5" />
            {t("addToCart")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Detalle de producto ──────────────────────────────────────────────────
function ProductDetailDrawer({
  product,
  currency,
  onClose,
  onAdded,
}: {
  product: StorefrontProduct | null;
  currency: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const t = useTranslations("store");
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  if (!product) {
    return (
      <Drawer open={false} onOpenChange={() => {}}>
        <DrawerContent />
      </Drawer>
    );
  }

  const soldOut = product.stock <= 0;
  const max = Math.min(product.stock, 99);

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <div className="mx-auto w-full max-w-md pb-8">
          <div className="relative mx-4 mt-2 aspect-[4/3] overflow-hidden rounded-2xl">
            <ProductImage product={product} sizes="448px" />
          </div>
          <DrawerHeader>
            <DrawerTitle className="flex items-start justify-between gap-3 text-xl tracking-tight">
              {product.name}
              <span className="font-extrabold">
                {formatPrice(product.priceCents, currency)}
              </span>
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4 px-4">
            {product.description ? (
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            ) : null}
            {soldOut ? (
              <Badge variant="secondary" className="w-fit rounded-full">
                {t("outOfStock")}
              </Badge>
            ) : (
              <>
                {product.stock <= 5 ? (
                  <p className="text-xs font-medium text-brand">
                    {t("lowStock", { count: product.stock })}
                  </p>
                ) : null}
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-full border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="-"
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full"
                      onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                      aria-label="+"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    className="flex-1 rounded-full"
                    onClick={() => {
                      cart.add(product.id, quantity);
                      toast.success(t("addedToCart"));
                      onAdded();
                    }}
                  >
                    <ShoppingBag className="size-4" />
                    {t("addToCart")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Botón flotante del carrito ───────────────────────────────────────────
function CartButton({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("store");
  const cart = useCart();
  if (cart.count === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("cart")}
      className="animate-fade-up fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-primary px-5 py-3.5 font-bold text-primary-foreground shadow-soft transition-transform hover:scale-[1.03] active:scale-[0.97]"
    >
      <ShoppingBag className="size-5" />
      {t("cart")}
      <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
        {cart.count}
      </span>
    </button>
  );
}

// ── Carrito + checkout + confirmación ────────────────────────────────────
function CartDrawer({
  open,
  onClose,
  store,
  productById,
}: {
  open: boolean;
  onClose: () => void;
  store: StorefrontStore;
  productById: Map<string, StorefrontProduct>;
}) {
  const t = useTranslations("store");
  const cart = useCart();
  const [step, setStep] = useState<"cart" | "details" | "done">("cart");
  const [sending, setSending] = useState(false);
  const [orderRef, setOrderRef] = useState("");
  const [doneEmail, setDoneEmail] = useState("");

  const lines = [...cart.items.entries()]
    .map(([id, quantity]) => ({ product: productById.get(id), quantity }))
    .filter(
      (l): l is { product: StorefrontProduct; quantity: number } =>
        Boolean(l.product)
    );
  const subtotal = lines.reduce(
    (sum, l) => sum + l.product.priceCents * l.quantity,
    0
  );
  const total = subtotal + (lines.length > 0 ? store.shippingCents : 0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        customerName: form.get("name"),
        customerEmail: email,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
        })),
        turnstileToken: form.get("cf-turnstile-response") ?? undefined,
      }),
    });
    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(
        data?.error === "out_of_stock" ? t("outOfStockError") : t("orderError")
      );
      return;
    }

    const data = await res.json();
    cart.clear();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setOrderRef(String(data.order.id).slice(0, 8).toUpperCase());
    setDoneEmail(email);
    setStep("done");
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
          if (step === "done") setStep("cart");
          if (step === "details" && !sending) setStep("cart");
        }
      }}
    >
      <DrawerContent>
        <div className="mx-auto w-full max-w-md pb-8">
          {step === "done" ? (
            <div className="hero-glow px-6 py-10 text-center">
              <p className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand/10">
                <VendiDot pulse className="size-3" />
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight">
                {t("orderConfirmedTitle")}
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("orderRef")} · {orderRef}
              </p>
              <p className="mx-auto mt-3 max-w-xs text-sm font-light leading-relaxed text-muted-foreground">
                {t("orderConfirmedText", { email: doneEmail })}
              </p>
              <Button
                onClick={() => {
                  onClose();
                  setStep("cart");
                }}
                className="mt-6 rounded-full"
              >
                {t("continueShopping")}
              </Button>
            </div>
          ) : step === "details" ? (
            <>
              <DrawerHeader>
                <DrawerTitle className="tracking-tight">
                  {t("yourDetails")}
                </DrawerTitle>
              </DrawerHeader>
              <form
                method="post"
                onSubmit={onSubmit}
                className="grid gap-4 px-4"
              >
                <div className="grid gap-2">
                  <Label htmlFor="checkout-name">{t("yourName")}</Label>
                  <Input id="checkout-name" name="name" minLength={2} required autoFocus />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="checkout-email">{t("yourEmail")}</Label>
                  <Input
                    id="checkout-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-sm font-bold">
                  <span>{t("total")}</span>
                  <span>{formatPrice(total, store.currency)}</span>
                </div>
                <Turnstile />
                <p className="text-xs font-light text-muted-foreground">
                  {t("payNote")}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("cart")}
                    className="rounded-full"
                  >
                    <ArrowLeft className="size-4" />
                    {t("backToCart")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="flex-1 rounded-full"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {sending ? t("sending") : t("confirmOrder")}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DrawerHeader>
                <DrawerTitle className="tracking-tight">
                  {t("cart")}
                </DrawerTitle>
              </DrawerHeader>
              <div className="grid gap-4 px-4">
                {lines.length === 0 ? (
                  <EmptyState
                    icon={ShoppingBag}
                    title={t("cartEmpty")}
                    hint={t("cartEmptyHint")}
                  />
                ) : (
                  <>
                    <div className="grid gap-3">
                      {lines.map(({ product, quantity }) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3"
                        >
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                            <ProductImage product={product} sizes="56px" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold tracking-tight">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(product.priceCents, store.currency)}
                            </p>
                          </div>
                          <div className="flex items-center rounded-full border">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-full"
                              aria-label="-"
                              onClick={() =>
                                cart.setQuantity(product.id, quantity - 1)
                              }
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-xs font-bold">
                              {quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-full"
                              aria-label="+"
                              disabled={quantity >= product.stock}
                              onClick={() =>
                                cart.setQuantity(product.id, quantity + 1)
                              }
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full text-muted-foreground"
                            aria-label={t("remove")}
                            onClick={() => cart.remove(product.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-1.5 border-t pt-3 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("subtotal")}</span>
                        <span>{formatPrice(subtotal, store.currency)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("shipping")}</span>
                        <span>
                          {store.shippingCents > 0
                            ? formatPrice(store.shippingCents, store.currency)
                            : t("shippingFree")}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold tracking-tight">
                        <span>{t("total")}</span>
                        <span>{formatPrice(total, store.currency)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setStep("details")}
                      className="rounded-full"
                    >
                      {t("checkoutButton")}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
