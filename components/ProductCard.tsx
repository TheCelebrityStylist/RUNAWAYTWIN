// FILE: components/ProductCard.tsx
"use client";

import * as React from "react";
import type { Product } from "@/lib/affiliates/types";
import { convert, currencyFromCountry, normalizeCode, type IsoCurrency } from "@/lib/affiliates/currency";
import { usePrefs } from "@/lib/hooks/usePrefs";

type Props = {
  item: Product;
};

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

  // Determine target currency from country
  const targetCurrency: IsoCurrency = currencyFromCountry(prefs.country) ?? "EUR";

  const basePrice = typeof item.price === "number" ? item.price : undefined;
  const baseCur = normalizeCode(item.currency) ?? "EUR";

  // Compute local price if needed
  const showLocal = basePrice !== undefined && baseCur !== targetCurrency;
  const localPrice = showLocal ? convert(basePrice!, baseCur, targetCurrency) : undefined;

  const price = fmt(basePrice, baseCur);
  const local = showLocal ? fmt(localPrice, targetCurrency) : null;

  const retailer = item.retailer ?? "store";

  return (
    <article className="group grid rounded-2xl border bg-white transition hover:shadow-md focus-within:shadow-md">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[4/5] overflow-hidden rounded-t-2xl"
        aria-label={`${item.title} — open product`}
      >
        {/* Image */}
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
        {/* Retailer badge */}
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
            ≈ {local}
            <span className="ml-1">in your currency</span>
          </div>
        )}

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
        <div className="h-3 w-2/3 rounded bg-gray-100" />
        <div className="mt-1 h-9 w-full rounded-xl bg-gray-100" />
      </div>
    </article>
  );
}
