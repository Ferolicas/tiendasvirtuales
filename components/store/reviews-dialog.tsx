"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export interface PublicReview {
  rating: number;
  comment: string | null;
  customerName: string;
  createdAt: string;
}

// La calificación de la cabecera es clicable: abre el modal con todas las
// reseñas (nombre del cliente, estrellas y comentario).
export function ReviewsDialog({
  rating,
  count,
  reviews,
}: {
  rating: string | null;
  count: number;
  reviews: PublicReview[];
}) {
  const t = useTranslations("store");
  const [open, setOpen] = useState(false);

  if (!rating || count === 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm">
        <Star className="size-4 fill-amber-400 text-amber-400" />
        <span className="text-muted-foreground">{t("noReviews")}</span>
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-1.5 rounded-full text-sm transition-opacity hover:opacity-75"
        aria-label={t("reviewsTitle")}
      >
        <Star className="size-4 fill-amber-400 text-amber-400" />
        <span className="font-bold">{rating}</span>
        <span className="text-muted-foreground underline-offset-2 hover:underline">
          {t("reviewsCount", { count })}
        </span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <div className="mx-auto w-full max-w-md overflow-y-auto pb-8">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2 tracking-tight">
                <Star className="size-5 fill-amber-400 text-amber-400" />
                {rating} · {t("reviewsTitle")}
              </DrawerTitle>
            </DrawerHeader>
            <div className="grid gap-3 px-4">
              {reviews.map((review, i) => (
                <div
                  key={i}
                  className="grid gap-1.5 rounded-2xl border bg-card p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          className={`size-3.5 ${
                            value <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {review.comment ? (
                    <p className="text-sm font-light leading-relaxed">
                      “{review.comment}”
                    </p>
                  ) : null}
                  <p className="text-xs font-bold tracking-tight">
                    — {review.customerName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
