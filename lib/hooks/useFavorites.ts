// FILE: lib/hooks/useFavorites.ts
"use client";

import * as React from "react";
import type { Product } from "@/lib/affiliates/types";

const KEY = "rwt-favorites-v1";

export function useFavorites() {
  const [favorites, setFavorites] = React.useState<Record<string, Product>>({});

  // Load on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Save when changed
  React.useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  const toggle = React.useCallback((p: Product) => {
    setFavorites((f) => {
      const key = p.url || p.id || p.title;
      const copy = { ...f };
      if (copy[key]) delete copy[key];
      else copy[key] = p;
      return copy;
    });
  }, []);

  const clear = React.useCallback(() => setFavorites({}), []);
  const list = React.useMemo(() => Object.values(favorites), [favorites]);
  const isFav = React.useCallback(
    (p: Product) => {
      const key = p.url || p.id || p.title;
      return !!favorites[key];
    },
    [favorites]
  );

  return { list, toggle, isFav, clear };
}
