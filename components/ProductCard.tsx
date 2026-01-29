// FILE: components/ProductCard.tsx
"use client";

import * as React from "react";
import type { Product } from "@/lib/affiliates/types";

function formatPrice(price?: number | null, currency?: string | null) {
  if (typeof price !== "number") return "Price at retailer";
  const cur = currency || "EUR";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(price);
  } catch {
    return `${cur} ${price.toFixed(0)}`;
  }
}

function uniqueKey(p: Product) {
  return `${p.id}|${p.url}`;
}

export function ProductCard({ item }: { item: Product }) {
  const key = uniqueKey(item);

  const [imgSrc, setImgSrc] = React.useState<string>(item.image || "/placeholder.svg");

  React.useEffect(() => {
    setImgSrc(item.image || "/placeholder.svg");
  }, [item.image]);

  return (
    <article className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="relative overflow-hidden rounded-2xl bg-gray-50">
        <img
          src={imgSrc}
          alt={item.title}
          className="h-72 w-full object-cover"
          loading="lazy"
          onError={() => setImgSrc("/placeholder.svg")}
        />
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium shadow-sm"
          aria-label={`Save ${item.title}`}
        >
          Save
        </button>
      </div>

      <div className="mt-3 grid gap-1">
        <h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>
        <p className="text-xs text-gray-500">
          {(item.brand || item.retailer || "—") + " · " + (item.fit?.category || "Accessory")}
        </p>
        <p className="text-xs text-gray-700">{formatPrice(item.price, item.currency)}</p>
      </div>

      <div className="mt-3">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            View
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium text-gray-400"
            aria-disabled="true"
          >
            No link
          </button>
        )}
      </div>

      <span className="sr-only">{key}</span>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border bg-white p-3 shadow-sm">
      <div className="h-72 w-full rounded-2xl bg-gray-100" />
      <div className="mt-3 h-4 w-3/4 rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
      <div className="mt-4 h-10 w-full rounded-xl bg-gray-100" />
    </div>
  );
}
