// FILE: lib/hooks/useFavorites.ts
"use client";

import * as React from "react";

export type FavProduct = {
  id?: string | null;
  title: string;
  url?: string | null;
  image?: string | null;
  brand?: string | null;
  retailer?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
};

type MapShape = Record<string, FavProduct>;

const KEY = "rwt-favorites-v1";

/** Safe JSON parse */
function readStore(): MapShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as MapShape;
  } catch {
    return {};
  }
}

function writeStore(obj: MapShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    /* ignore quota / private mode */
  }
}

function stableKey(p: FavProduct): string {
  if (p.url) return p.url;
  if (p.id) return `id:${p.id}`;
  return `title:${p.title}`;
}

export function useFavorites() {
  const [map, setMap] = React.useState<MapShape>(() => (typeof window !== "undefined" ? readStore() : {}));

  const commit = React.useCallback((next: MapShape) => {
    setMap(next);
    writeStore(next);
  }, []);

  const add = React.useCallback((p: FavProduct) => {
    const key = stableKey(p);
    commit({ ...map, [key]: p });
  }, [map, commit]);

  const remove = React.useCallback((p: FavProduct | string) => {
    const key = typeof p === "string" ? p : stableKey(p);
    const next = { ...map };
    delete next[key];
    commit(next);
  }, [map, commit]);

  const toggle = React.useCallback((p: FavProduct) => {
    const key = stableKey(p);
    if (map[key]) {
      const next = { ...map };
      delete next[key];
      commit(next);
    } else {
      commit({ ...map, [key]: p });
    }
  }, [map, commit]);

  const clear = React.useCallback(() => commit({}), [commit]);

  const list = React.useMemo(() => Object.values(map), [map]);

  const has = React.useCallback((p: FavProduct) => {
    const key = stableKey(p);
    return Boolean(map[key]);
  }, [map]);

  return { list, add, remove, toggle, has, clear };
}
