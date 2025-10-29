// FILE: lib/hooks/useFavorites.ts
"use client";

import * as React from "react";
import type { Product } from "@/lib/affiliates/types";

const STORAGE_KEY = "rwt-favorites-v1";

function readFavorites(): Record<string, Product> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Product>;
  } catch {
    return {};
  }
}

function writeFavorites(obj: Record<string, Product>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function useFavorites() {
  const [map, setMap] = React.useState<Record<string, Product>>({});

  React.useEffect(() => {
    setMap(readFavorites());
  }, []);

  const list = React.useMemo(() => Object.values(map), [map]);

  const add = (p: Product) => {
    setMap((prev) => {
      const key = p.url || p.id || p.title;
      const next = { ...prev, [key]: p };
      writeFavorites(next);
      return next;
    });
  };

  const remove = (p: Product) => {
    setMap((prev) => {
      const key = p.url || p.id || p.title;
      const next = { ...prev };
      delete next[key];
      writeFavorites(next);
      return next;
    });
  };

  const toggle = (p: Product) => {
    const key = p.url || p.id || p.title;
    setMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = p;
      writeFavorites(next);
      return next;
    });
  };

  const clear = () => {
    setMap({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const has = (p: Product): boolean => {
    const key = p.url || p.id || p.title;
    return !!map[key];
  };

  return { list, add, remove, toggle, has, clear };
}
