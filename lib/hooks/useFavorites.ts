// FILE: lib/hooks/useFavorites.ts
"use client";

import * as React from "react";
import type { Product } from "@/lib/affiliates/types";

/** ----------------------------------------------------------------
 * Backwards-compatible favorites store.
 * - Persists a map of key → Product in localStorage.
 * - Accepts either the new Product shape OR the old legacy shape.
 * - Automatically migrates legacy entries (with top-level `category`).
 * ---------------------------------------------------------------- */

export type LegacyFavProduct = {
  id?: string | null;
  title: string;
  url?: string | null;
  image?: string | null;
  brand?: string | null;
  retailer?: string | null;
  category?: string | null; // legacy: now lives at product.fit?.category
  price?: number | null;
  currency?: string | null;
};

type StoreMap = Record<string, Product>;
const KEY = "rwt-favorites-v1";

/* ---------------------------- helpers ---------------------------- */

function keyFor(p: Product | LegacyFavProduct): string {
  // Prefer stable URL; else id; else title
  const url = (p as any)?.url;
  const id = (p as any)?.id;
  const title = (p as any)?.title;
  if (typeof url === "string" && url) return url;
  if (typeof id === "string" && id) return `id:${id}`;
  return `title:${title ?? ""}`;
}

function isProduct(x: unknown): x is Product {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as any).title === "string" &&
    typeof (x as any).url === "string"
  );
}

/** Normalize either a Product or legacy shape into a Product */
function normalize(p: Product | LegacyFavProduct): Product | null {
  if (!p || typeof p !== "object") return null;

  // New Product arrives already valid
  if ((p as Product).url && (p as Product).title && (p as any).fit !== undefined) {
    const np = p as Product;
    // Ensure no nulls sneak in for optional scalars
    return {
      ...np,
      brand: typeof np.brand === "string" ? np.brand : undefined,
      retailer: typeof np.retailer === "string" ? np.retailer : undefined,
      image: typeof np.image === "string" ? np.image : undefined,
      price:
        typeof np.price === "number" && Number.isFinite(np.price) ? np.price : undefined,
      currency: typeof np.currency === "string" ? np.currency : undefined,
      fit: np.fit ? { ...np.fit, category: np.fit.category } : undefined,
    };
  }

  // Legacy → Product
  const lp = p as LegacyFavProduct;
  const title = typeof lp.title === "string" ? lp.title : "";
  const url = typeof lp.url === "string" ? lp.url : "";
  if (!title || !url) return null;

  const id =
    (typeof lp.id === "string" && lp.id) || (url ? url : title);

  const prod: Product = {
    id,
    title,
    url,
    brand: typeof lp.brand === "string" ? lp.brand || undefined : undefined,
    retailer:
      typeof lp.retailer === "string" ? lp.retailer || undefined : undefined,
    image: typeof lp.image === "string" ? lp.image || undefined : undefined,
    price:
      typeof lp.price === "number" && Number.isFinite(lp.price)
        ? lp.price
        : undefined,
    currency: typeof lp.currency === "string" ? lp.currency || undefined : undefined,
    fit: lp.category ? { category: lp.category || undefined } : undefined,
    attrs: undefined,
  };
  return prod;
}

/** Safe JSON parse of the store; migrates legacy entries on read */
function readStore(): StoreMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    // parsed might be Product map or legacy map → normalize all values
    const next: StoreMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const prod = normalize(v as any);
      if (prod) next[k] = prod;
    }
    // If we migrated anything, write back once.
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
}

function writeStore(map: StoreMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

/* ----------------------------- hook ----------------------------- */

export function useFavorites() {
  const [map, setMap] = React.useState<StoreMap>(() =>
    typeof window === "undefined" ? {} : readStore()
  );

  const commit = React.useCallback((next: StoreMap) => {
    setMap(next);
    writeStore(next);
  }, []);

  const list = React.useMemo(() => Object.values(map), [map]);

  const has = React.useCallback(
    (p: Product | LegacyFavProduct) => {
      const key = keyFor(p);
      return Boolean(map[key]);
    },
    [map]
  );

  const add = React.useCallback(
    (p: Product | LegacyFavProduct) => {
      const norm = normalize(p);
      if (!norm) return;
      const key = keyFor(norm);
      if (map[key]) return;
      commit({ ...map, [key]: norm });
    },
    [map, commit]
  );

  const remove = React.useCallback(
    (p: Product | LegacyFavProduct | string) => {
      const key = typeof p === "string" ? p : keyFor(p);
      if (!map[key]) return;
      const next = { ...map };
      delete next[key];
      commit(next);
    },
    [map, commit]
  );

  const toggle = React.useCallback(
    (p: Product | LegacyFavProduct) => {
      const key = keyFor(p);
      if (map[key]) {
        const next = { ...map };
        delete next[key];
        commit(next);
      } else {
        const norm = normalize(p);
        if (!norm) return;
        commit({ ...map, [key]: norm });
      }
    },
    [map, commit]
  );

  const clear = React.useCallback(() => commit({}), [commit]);

  return { list, add, remove, toggle, has, clear };
}

