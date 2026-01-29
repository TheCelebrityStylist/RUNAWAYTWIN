// FILE: components/InlineProductCard.tsx
"use client";

import * as React from "react";
import FavButton from "@/components/FavButton";
import type { Product } from "@/lib/affiliates/types";

type Props = {
  item: Product;
};

export default function InlineProductCard({ item }: Props) {
  const price =
    typeof item.price === "number"
      ? `${item.currency ?? "EUR"} ${Math.round(item.price)}`
      : "—";

  const retailer =
    item.retailer ??
    (safeHost(item.url) ? safeHost(item.url) : "store");
  const link = item.affiliate_url ?? item.url;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition hover:shadow-md focus-within:shadow-md">
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-[4/5] overflow-hidden"
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
      ) : (
        <div className="relative block aspect-[4/5] overflow-hidden bg-gray-100">
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
            {retailer}
          </div>
        </div>
      )}

      <div className="grid gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</h3>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="truncate">{item.brand ?? "—"}</span>
          <span className="font-semibold text-gray-900">{price}</span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
            >
              View
            </a>
          ) : (
            <span className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-400">
              Unavailable
            </span>
          )}
          <FavButton product={item} />
        </div>
      </div>
    </article>
  );
}

function safeHost(u?: string) {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
