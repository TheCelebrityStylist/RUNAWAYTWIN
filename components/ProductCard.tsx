// FILE: components/ProductCard.tsx
"use client";

import * as React from "react";
import type { Product } from "@/lib/affiliates/types";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/hooks/useFavorites";

type Props = {
  item: Product;
};

function formatPrice(value?: number, currency?: string) {
  if (typeof value !== "number") return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${currency ?? ""}`.trim();
  }
}

export function ProductCard({ item }: Props) {
  const price = formatPrice(item.price, item.currency);
  const retailer = item.retailer ?? "store";
  const { toggle, isFav } = useFavorites();
  const fav = isFav(item);

  return (
    <article className="group relative grid rounded-2xl border bg-white transition hover:shadow-md focus-within:shadow-md">
      <button
        type="button"
        onClick={() => toggle(item)}
        className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1 text-gray-600 backdrop-blur-sm transition hover:text-red-500 focus-visible:ring-2 focus-visible:ring-black/60"
        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={`h-5 w-5 ${fav ? "fill-red-500 text-red-500" : "fill-none"}`}
        />
      </button>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[4/5] overflow-hidden rounded-t-2xl"
        aria-label={`${item.title} — open product`}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div aria-hidden className="h-full w-full bg-gray-100" />
        )}
        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
          {retailer}
        </div>
      </a>

      <div className="grid gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</h3>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="truncate">{item.brand ?? "—"}</span>
          <span className="font-semibold text-gray-900">{price}</span>
        </div>
        <div className="mt-1 flex gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            View
          </a>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="grid animate-pulse rounded-2xl border bg-white">
      <div className="aspect-[4/5] rounded-t-2xl bg-gray-100" />
      <div className="grid gap-2 p-3">
        <div className="h-4 w-3/4 rounded bg-gray-100" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
        <div className="mt-1 h-9 w-full rounded-xl bg-gray-100" />
      </div>
    </article>
  );
}
