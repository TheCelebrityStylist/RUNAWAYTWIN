// FILE: components/ProductCard.tsx
"use client";

import * as React from "react";

/**
 * ProductCard with local favorite toggle.
 * Works with the /looks page by writing to the shared KEY "rwt-favorites-v1"
 * as a map of uniqueKey -> Product JSON.
 */

type Product = {
  id?: string | null;
  title: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
  url: string;
  retailer?: string | null;
  category?: string | null;
};

const FAV_KEY = "rwt-favorites-v1";

function readFavMap(): Record<string, Product> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as Record<string, Product>;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeFavMap(map: Record<string, Product>) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function uniqueKey(p: Product) {
  return p.url || p.id || p.title;
}

export function ProductCard({ item }: { item: Product }) {
  const key = uniqueKey(item);

  const [fav, setFav] = React.useState<boolean>(() => {
    const map = readFavMap();
    return Boolean(map[key]);
  });

  const toggleFav = React.useCallback(() => {
    const map = readFavMap();
    if (fav) {
      delete map[key];
      writeFavMap(map);
      setFav(false);
    } else {
      map[key] = item;
      writeFavMap(map);
      setFav(true);
    }
  }, [fav, item, key]);

  return (
    <article className="relative grid h-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* Favorite button */}
      <button
        type="button"
        onClick={toggleFav}
        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
        className={`absolute right-2 top-2 rounded-full border px-2 py-1 text-xs font-semibold backdrop-blur transition ${
          fav
            ? "border-red-500 bg-red-500/90 text-white"
            : "border-neutral-300 bg-white/90 text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        {fav ? "♥" : "♡"}
      </button>

      {/* Image */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-[3/4] w-full overflow-hidden bg-neutral-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image || "/placeholder.png"}
          alt={item.title}
          className="h-full w-full object-cover transition hover:scale-[1.02]"
          loading="lazy"
        />
      </a>

      {/* Body */}
      <div className="grid gap-1 p-3 text-sm">
        <p className="text-xs text-neutral-500">{item.brand || item.retailer || "—"}</p>
        <h3 className="line-clamp-2 font-medium text-neutral-900">{item.title}</h3>
        <p className="text-xs text-neutral-500">{item.category || ""}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="text-sm font-semibold text-neutral-900">
          {typeof item.price === "number" && item.currency
            ? `${item.currency} ${item.price}`
            : item.currency
            ? `${item.currency} ?`
            : "—"}
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        >
          View
        </a>
      </div>
    </article>
  );
}
