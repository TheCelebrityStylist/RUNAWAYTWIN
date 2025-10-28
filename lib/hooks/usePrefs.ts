// FILE: lib/hooks/usePrefs.ts
"use client";

import * as React from "react";
import type { Prefs } from "@/lib/types";

const KEY = "rwt-prefs";

const DEFAULT_PREFS: Prefs = {
  gender: undefined,
  bodyType: undefined,
  budget: undefined, // e.g., "€300–€600"
  country: undefined, // e.g., "NL"
  keywords: [],
  sizes: {
    top: undefined,
    bottom: undefined,
    dress: undefined,
    shoe: undefined,
  },
};

export function usePrefs() {
  const [prefs, setPrefs] = React.useState<Prefs>(DEFAULT_PREFS);

  // Load once
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        setPrefs((p) => ({
          ...p,
          ...parsed,
          sizes: { ...p.sizes, ...(parsed.sizes ?? {}) },
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : p.keywords,
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  React.useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const update = React.useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => ({
      ...p,
      ...patch,
      sizes: { ...p.sizes, ...(patch.sizes ?? {}) },
      keywords:
        patch.keywords !== undefined
          ? Array.isArray(patch.keywords)
            ? patch.keywords
            : p.keywords
          : p.keywords,
    }));
  }, []);

  const reset = React.useCallback(() => setPrefs(DEFAULT_PREFS), []);

  return { prefs, update, reset };
}

  const reset = React.useCallback(() => setPrefs(DEFAULT_PREFS), []);

  return { prefs, update, reset };
}

