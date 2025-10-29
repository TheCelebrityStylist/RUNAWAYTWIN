// FILE: components/ProductCard.tsx
"use client";

import * as React from "react";
import type { Product } from "@/lib/affiliates/types";
import {
  convert,
  currencyFromCountry,
  normalizeCode,
  type IsoCurrency,
} from "@/lib/affiliates/currency";
import { usePrefs } from "@/lib/hooks/usePrefs";
import { useFavorites } from "@/lib/hooks/useFavorites";

/** Minimal inline Heart icon (no external deps). */
function HeartIcon({
  filled,
  size = 16,
  className,
  "aria-hidden": ariaHidden = true,
}: {
  filled: boolean;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": ariaHidden,
    className,
  } as const;

  if (filled) {
    return (
      <svg {...common} fill="currentColor">
        <path d="M12 21s-5.052-3.327-8.016-6.29C1.35 12.074 1.7 8.86 3.94 7.08a5.06 5.06 0 0 1 6.46.4l.6.6.6-.6a5.06 5.06 0 0 1 6.46-.4c2.24 1.78 2.59 4.995-.044 7.63C17.052 17.673 12 21 12 21z" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

type Props = { item: Product };

function fmt(value?: number, currency?: string) {
  if (typeof value !== "number") return "—";
  const cur = (currency ?? "EUR") as string;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} ${cur}`;
  }
}

export function ProductCard({ item }: Props) {
  const { prefs } = usePrefs();
  const { toggle, has } = useFavorites();
  const fav = has(item);

  const targetCurrency: IsoCurrency = currencyFromCountry(prefs.country) ?? "EUR";
  const basePrice = typeof item.price === "number" ? item.price : undefined;
  const baseCur = normalizeCode(item.currency) ?? "EUR";
  const showLocal = basePrice !== undefined && baseCur !== targetCurrency;
  const localPrice = showLocal ? convert(basePrice!, baseCur, targetCurrency) : undefined;
  const price = fmt(basePrice, baseCur);
  const local = showLocal ? fmt(localPrice, targetCurrency) : null;
  const retailer = item.retailer ?? "store";

  return (
    <article
      className="group relative grid rounded-2xl border bg-white transition hover:shadow-md focus-within:shadow-md"
      aria-label={item.title}
    >
      {/* Favorite toggle */}
      <button
        type="button"
        onClick={() => toggle(item)}
        aria-pressed={fav}
        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
        className={`absolute right-2 top-2 z-10 rounded-full p-1.5 backdrop-blur-sm transition ${
          fav ? "bg-red-500/90 text-white" : "bg-white/70 text-gray-700 hover:bg-white"
        }`}
      >
        <HeartIcon filled={fav} size={16} className={fav ? "fill-current" : "stroke-current"} />
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
        {local && (
          <div className="text-[11px] text-gray-500">
            ≈ {local} <span className="ml-1">in your currency</span>
          </div>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
        >
          View
        </a>
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
        <div className="h-3 w-2/3 rounded bg-gray-100" />
        <div className="mt-1 h-9 w-full rounded-xl bg-gray-100" />
      </div>
    </article>
  );
}
