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
  Bike,
  Flame,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
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
import { VendiDot, VendiLiveDot } from "@/components/shared/vendi-dot";
import { TrackOrder } from "@/components/store/track-order";
import { formatPrice } from "@/lib/format";
import { ChevronUp, X as XIcon } from "lucide-react";
import { io as ioClient, type Socket as SocketType } from "socket.io-client";

export interface StorefrontStore {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  shippingCents: number;
  pickupEnabled: boolean;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  imageUrl: string | null;
  stock: number;
  unlimitedStock: boolean;
  recommended: boolean;
  salesCount: number;
  categoryId: string | null;
}

export interface StorefrontCategory {
  id: string;
  name: string;
}

function maxQuantity(product: StorefrontProduct): number {
  return product.unlimitedStock ? 99 : Math.min(product.stock, 99);
}

function isSoldOut(product: StorefrontProduct): boolean {
  return !product.unlimitedStock && product.stock <= 0;
}

function discountPercent(product: StorefrontProduct): number | null {
  if (!product.compareAtCents || product.compareAtCents <= product.priceCents) {
    return null;
  }
  return Math.round(
    (1 - product.priceCents / product.compareAtCents) * 100
  );
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
  categories,
  products: initialProducts,
}: {
  store: StorefrontStore;
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
}) {
  const t = useTranslations("store");
  const tEmpty = useTranslations("empty");
  const storageKey = `vendi-cart-${store.id}`;

  const [items, setItems] = useState<Map<string, number>>(new Map());
  const [hydrated, setHydrated] = useState(false);
  const [detail, setDetail] = useState<StorefrontProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  // Pedido en curso del comprador en ESTA tienda (persistente entre visitas)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    setActiveOrderId(localStorage.getItem(`vendi-active-order-${store.id}`));
  }, [store.id]);

  // Catálogo en vivo: el dueño crea, edita u oculta un producto y los
  // visitantes lo ven al instante, sin recargar.
  const [products, setProducts] = useState(initialProducts);
  useEffect(() => setProducts(initialProducts), [initialProducts]);
  useEffect(() => {
    type LiveProduct = StorefrontProduct & { active: boolean };
    const socket: SocketType = ioClient({
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => socket.emit("catalog:join", store.id));
    socket.on("product:new", ({ product }: { product: LiveProduct }) => {
      if (!product.active) return;
      setProducts((prev) =>
        prev.some((p) => p.id === product.id) ? prev : [...prev, product]
      );
    });
    socket.on("product:update", ({ product }: { product: LiveProduct }) => {
      setProducts((prev) => {
        if (!product.active) return prev.filter((p) => p.id !== product.id);
        return prev.some((p) => p.id === product.id)
          ? prev.map((p) => (p.id === product.id ? product : p))
          : [...prev, product];
      });
    });
    socket.on("product:delete", ({ id }: { id: string }) => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    });
    return () => {
      socket.disconnect();
    };
  }, [store.id]);
  const [highlightTab, setHighlightTab] = useState<"recommended" | "best">(
    "recommended"
  );

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const recommended = useMemo(
    () => products.filter((p) => p.recommended),
    [products]
  );
  const bestSellers = useMemo(
    () =>
      [...products]
        .filter((p) => p.salesCount > 0)
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 8),
    [products]
  );
  const showHighlights = recommended.length > 0 || bestSellers.length > 0;
  const activeHighlight =
    highlightTab === "recommended" && recommended.length > 0
      ? recommended
      : bestSellers.length > 0
        ? bestSellers
        : recommended;

  const grouped = useMemo(() => {
    const byCategory = new Map<string | null, StorefrontProduct[]>();
    // Una categoría desconocida (p. ej. creada al vuelo y recibida por
    // socket antes de recargar) se agrupa como «sin categoría» para que el
    // producto nunca quede invisible.
    const known = new Set(categories.map((c) => c.id));
    for (const product of products) {
      const key =
        product.categoryId && known.has(product.categoryId)
          ? product.categoryId
          : null;
      byCategory.set(key, [...(byCategory.get(key) ?? []), product]);
    }
    const sections: { id: string | null; name: string | null; items: StorefrontProduct[] }[] = [];
    for (const category of categories) {
      const list = byCategory.get(category.id);
      if (list?.length) {
        sections.push({ id: category.id, name: category.name, items: list });
      }
    }
    const uncategorized = byCategory.get(null);
    if (uncategorized?.length) {
      sections.push({
        id: null,
        name: categories.length > 0 ? null : null,
        items: uncategorized,
      });
    }
    return sections;
  }, [products, categories]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const entries = JSON.parse(raw) as [string, number][];
        setItems(new Map(entries.filter(([id]) => productById.has(id))));
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
      const product = productById.get(productId);
      if (!product) return 0;
      return Math.max(0, Math.min(quantity, maxQuantity(product)));
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
      <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-6">
        {products.length === 0 ? (
          <EmptyState
            icon={StoreIcon}
            title={tEmpty("catalogTitle")}
            hint={tEmpty("catalogHint")}
            className="mx-auto mt-10 max-w-md"
          />
        ) : (
          <div className="grid gap-10">
            {/* División 1: Recomendados | Más vendidos */}
            {showHighlights ? (
              <div className="grid gap-4">
                <div className="flex gap-1.5">
                  {recommended.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setHighlightTab("recommended")}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold tracking-tight transition-colors ${
                        highlightTab === "recommended"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="size-3.5" />
                      {t("recommendedTab")}
                    </button>
                  ) : null}
                  {bestSellers.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setHighlightTab("best")}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold tracking-tight transition-colors ${
                        highlightTab === "best" || recommended.length === 0
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Flame className="size-3.5" />
                      {t("bestSellersTab")}
                    </button>
                  ) : null}
                </div>
                <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6">
                  {activeHighlight.map((product) => (
                    <div key={product.id} className="w-44 shrink-0 sm:w-52">
                      <ProductCard
                        product={product}
                        currency={store.currency}
                        onOpen={() => setDetail(product)}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* División 2: catálogo completo por categorías */}
            <div className="grid gap-8">
              <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                <VendiDot className="size-2" />
                {t("fullCatalog")}
              </h2>
              {grouped.map((section) => (
                <div key={section.id ?? "otros"} className="grid gap-4">
                  {section.name !== null || categories.length > 0 ? (
                    <h3 className="text-lg font-bold tracking-tight">
                      {section.name ?? t("otherCategory")}
                    </h3>
                  ) : null}
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                    {section.items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        currency={store.currency}
                        onOpen={() => setDetail(product)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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

      <CartButton onOpen={() => setCartOpen(true)} lifted={Boolean(activeOrderId)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        store={store}
        productById={productById}
        onOrderPlaced={(orderId) => {
          localStorage.setItem(`vendi-active-order-${store.id}`, orderId);
          setActiveOrderId(orderId);
        }}
      />
      <ActiveOrderBar
        storeId={store.id}
        orderId={activeOrderId}
        onClear={() => {
          localStorage.removeItem(`vendi-active-order-${store.id}`);
          setActiveOrderId(null);
        }}
      />
    </CartContext.Provider>
  );
}

// ── Etiqueta de stock según las reglas del fundador ──────────────────────
function StockLabel({ product }: { product: StorefrontProduct }) {
  const t = useTranslations("store");
  if (product.unlimitedStock) return null;
  if (product.stock <= 0) return null; // el overlay «Agotado» ya lo cubre
  if (product.stock <= 10) {
    return (
      <p className="text-xs font-medium text-brand">
        {t("lowStock", { count: product.stock })}
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">{t("unitsAvailable")}</p>
  );
}

function PriceBlock({
  product,
  currency,
  large = false,
}: {
  product: StorefrontProduct;
  currency: string;
  large?: boolean;
}) {
  const percent = discountPercent(product);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={`font-extrabold tracking-tight ${large ? "text-xl" : ""}`}
      >
        {formatPrice(product.priceCents, currency)}
      </span>
      {percent ? (
        <span className="text-xs text-muted-foreground line-through">
          {formatPrice(product.compareAtCents as number, currency)}
        </span>
      ) : null}
    </div>
  );
}

// ── Tarjeta de producto ──────────────────────────────────────────────────
function ProductCard({
  product,
  currency,
  onOpen,
  compact = false,
}: {
  product: StorefrontProduct;
  currency: string;
  onOpen: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("store");
  const cart = useCart();
  const soldOut = isSoldOut(product);
  const inCart = cart.items.get(product.id) ?? 0;
  const canAdd = !soldOut && inCart < maxQuantity(product);
  const percent = discountPercent(product);

  return (
    <div className="hover-lift group flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-soft">
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
        {percent ? (
          <Badge className="absolute left-3 top-3 rounded-full bg-brand font-extrabold text-brand-foreground">
            {t("discountBadge", { percent })}
          </Badge>
        ) : null}
        {soldOut ? (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/80 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-background backdrop-blur-sm">
            {t("outOfStock")}
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <button type="button" onClick={onOpen} className="text-left">
          <p className="font-bold tracking-tight">{product.name}</p>
          {!compact && product.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs font-light text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </button>
        <StockLabel product={product} />
        <div className="mt-auto grid gap-2">
          <PriceBlock product={product} currency={currency} />
          <Button
            size="sm"
            disabled={!canAdd}
            onClick={() => {
              cart.add(product.id);
              toast.success(t("addedToCart"));
            }}
            className="w-full rounded-full"
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

  const soldOut = isSoldOut(product);
  const max = maxQuantity(product);

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <div className="mx-auto w-full max-w-md max-h-[85dvh] overflow-y-auto pb-8">
          <div className="relative mx-4 mt-2 aspect-[4/3] overflow-hidden rounded-2xl">
            <ProductImage product={product} sizes="448px" />
          </div>
          <DrawerHeader>
            <DrawerTitle className="flex items-start justify-between gap-3 text-xl tracking-tight">
              {product.name}
              <PriceBlock product={product} currency={currency} large />
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-4 px-4">
            {product.description ? (
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            ) : null}
            <StockLabel product={product} />
            {soldOut ? (
              <Badge variant="secondary" className="w-fit rounded-full">
                {t("outOfStock")}
              </Badge>
            ) : (
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
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Botón flotante del carrito ───────────────────────────────────────────
function CartButton({
  onOpen,
  lifted,
}: {
  onOpen: () => void;
  lifted: boolean;
}) {
  const t = useTranslations("store");
  const cart = useCart();
  if (cart.count === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("cart")}
      className={`animate-fade-up fixed right-5 z-40 flex items-center gap-2.5 rounded-full bg-primary px-5 py-3.5 font-bold text-primary-foreground shadow-soft transition-all hover:scale-[1.03] active:scale-[0.97] ${
        lifted ? "bottom-20" : "bottom-5"
      }`}
    >
      <ShoppingBag className="size-5" />
      {t("cart")}
      <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-brand-foreground">
        {cart.count}
      </span>
    </button>
  );
}

// ── Barra persistente del pedido en curso ────────────────────────────────
// Vive abajo vaya donde vaya el comprador dentro de la tienda; al tocarla
// se expande el seguimiento completo; la X solo la minimiza. Desaparece
// únicamente cuando el pedido termina (entregado/cancelado) y se descarta.
interface TrackedSummary {
  id: string;
  orderNumber: number;
  status: string;
  fulfillment: "delivery" | "pickup";
  customerName: string;
  storeName: string;
  storePhone: string | null;
  vertical: "food" | "digital" | "general";
  hasReview: boolean;
}

function ActiveOrderBar({
  storeId,
  orderId,
  onClear,
}: {
  storeId: string;
  orderId: string | null;
  onClear: () => void;
}) {
  const t = useTranslations("store");
  const tStatus = useTranslations("status");
  const [data, setData] = useState<TrackedSummary | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/track/${orderId}`).then(async (res) => {
      if (cancelled) return;
      if (!res.ok) {
        onClear();
        return;
      }
      setData(await res.json());
    });

    const socket: SocketType = ioClient({
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => socket.emit("order:join", orderId));
    socket.on("order:update", ({ status }: { status: string }) => {
      setData((prev) => (prev ? { ...prev, status } : prev));
    });
    return () => {
      cancelled = true;
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, storeId]);

  if (!orderId || !data) return null;

  const normalized = data.status === "shipped" ? "delivered" : data.status;
  const finished = normalized === "delivered" || normalized === "cancelled";

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={t("activeOrderOpen")}
        className="animate-fade-up fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-card/95 px-5 py-3 text-left shadow-soft backdrop-blur-md"
      >
        {finished ? (
          <VendiDot className="size-2.5" />
        ) : (
          <VendiLiveDot />
        )}
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="font-extrabold tracking-tight">
            {t("activeOrderLabel", { number: data.orderNumber })}
          </span>{" "}
          <span className="text-muted-foreground">
            · {tStatus(normalized as "paid")}
          </span>
        </span>
        <ChevronUp className="size-4 text-muted-foreground" />
      </button>

      <Drawer
        open={expanded}
        repositionInputs={false}
        onOpenChange={(open) => {
          if (!open) {
            setExpanded(false);
            // Si ya terminó, al cerrar se descarta para siempre.
            if (finished) onClear();
          }
        }}
      >
        <DrawerContent className="max-h-[92dvh]">
          {/* X: vuelve a la barrita minimizada (background) */}
          <button
            type="button"
            aria-label="✕"
            onClick={() => {
              setExpanded(false);
              if (finished) onClear();
            }}
            className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
          <div className="mx-auto w-full min-h-0 max-w-md flex-1 overflow-y-auto px-4 pb-10 pt-6">
            <TrackOrder
              order={{
                id: data.id,
                orderNumber: data.orderNumber,
                status: data.status,
                fulfillment: data.fulfillment,
                customerName: data.customerName,
                hasReview: data.hasReview,
              }}
              storeName={data.storeName}
              storePhone={data.storePhone}
              vertical={data.vertical}
              onExit={() => {
                setExpanded(false);
                if (finished) onClear();
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// ── Carrito + checkout v2 + confirmación con seguimiento ────────────────
function CartDrawer({
  open,
  onClose,
  store,
  productById,
  onOrderPlaced,
}: {
  open: boolean;
  onClose: () => void;
  store: StorefrontStore;
  productById: Map<string, StorefrontProduct>;
  onOrderPlaced: (orderId: string) => void;
}) {
  const t = useTranslations("store");
  const cart = useCart();
  const [step, setStep] = useState<"cart" | "details" | "done">("cart");
  const [sending, setSending] = useState(false);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(
    "delivery"
  );
  const [createAccount, setCreateAccount] = useState(false);
  const [done, setDone] = useState<{
    orderNumber: number;
    trackUrl: string;
    email: string;
  } | null>(null);

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
  const shipping =
    fulfillment === "delivery" && lines.length > 0 ? store.shippingCents : 0;
  const total = subtotal + shipping;

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
        customerPhone: form.get("phone"),
        fulfillment,
        deliveryAddress:
          fulfillment === "delivery" ? form.get("address") : undefined,
        paymentMethod: "card",
        createAccount,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
        })),
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
    // El pedido queda «en curso» en esta tienda (barra persistente),
    // también si nos vamos a Stripe y volvemos.
    onOrderPlaced(data.order.id);
    if (data.checkoutUrl) {
      window.location.assign(data.checkoutUrl);
      return;
    }
    setDone({
      orderNumber: data.order.orderNumber,
      trackUrl: data.trackUrl,
      email,
    });
    setStep("done");
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
          if (step !== "details" || !sending) setStep("cart");
        }
      }}
    >
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto w-full max-w-md max-h-[85dvh] overflow-y-auto pb-8">
          {step === "done" && done ? (
            <div className="hero-glow px-6 py-10 text-center">
              <p className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand/10">
                <VendiDot pulse className="size-3" />
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight">
                {t("orderConfirmedTitle")}
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("orderRef")} · #{done.orderNumber}
              </p>
              <p className="mx-auto mt-3 max-w-xs text-sm font-light leading-relaxed text-muted-foreground">
                {t("orderConfirmedText", { email: done.email })}
              </p>
              <div className="mt-6 grid gap-2">
                <Button asChild className="rounded-full">
                  <a href={done.trackUrl}>{t("trackOrder")}</a>
                </Button>
                <p className="text-xs font-light text-muted-foreground">
                  {t("trackHint")}
                </p>
              </div>
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
                  <Input
                    id="checkout-name"
                    name="name"
                    minLength={2}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="checkout-phone">{t("phoneLabel")}</Label>
                    <Input
                      id="checkout-phone"
                      name="phone"
                      type="tel"
                      minLength={6}
                      autoComplete="tel"
                      required
                    />
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
                </div>

                {/* Domicilio o recogida — siempre visible */}
                <div className="grid gap-2">
                  <Label>{t("fulfillmentLabel")}</Label>
                  <div
                    className={`grid gap-2 ${store.pickupEnabled ? "grid-cols-2" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setFulfillment("delivery")}
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                        fulfillment === "delivery"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Bike className="size-4" />
                      {t("deliveryOption")}
                    </button>
                    {store.pickupEnabled ? (
                      <button
                        type="button"
                        onClick={() => setFulfillment("pickup")}
                        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                          fulfillment === "pickup"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <StoreIcon className="size-4" />
                        {t("pickupOption")}
                      </button>
                    ) : null}
                  </div>
                </div>

                {fulfillment === "delivery" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="checkout-address">
                      {t("addressLabel")}
                    </Label>
                    <Input
                      id="checkout-address"
                      name="address"
                      minLength={5}
                      autoComplete="street-address"
                      required
                    />
                  </div>
                ) : null}

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="grid">
                    <span className="font-medium">
                      {t("createAccountLabel")}
                    </span>
                    <span className="text-xs font-light text-muted-foreground">
                      {t("createAccountHint")}
                    </span>
                  </span>
                </label>

                <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3 text-sm font-bold">
                  <span>{t("total")}</span>
                  <span>{formatPrice(total, store.currency)}</span>
                </div>
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
                              disabled={quantity >= maxQuantity(product)}
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
                          {shipping > 0
                            ? formatPrice(shipping, store.currency)
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
