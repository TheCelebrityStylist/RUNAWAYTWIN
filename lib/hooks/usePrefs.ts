// FILE: lib/hooks/usePrefs.ts
"use client";

import * as React from "react";
import type { Prefs, Gender } from "@/lib/types";

const LS_KEY = "rwt-prefs";

const DEFAULT_PREFS: Prefs = {
  gender: undefined,
  bodyType: undefined,
  budget: undefined,
  country: undefined,
  keywords: [],
  sizes: { top: undefined, bottom: undefined, dress: undefined, shoe: undefined },
};

export function usePrefs() {
  const [prefs, setPrefs] = React.useState<Prefs>(DEFAULT_PREFS);

  // load once
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Prefs;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const update = React.useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next: Prefs = {
        ...p,
        ...patch,
        sizes: { ...(p.sizes ?? {}), ...(patch.sizes ?? {}) },
      };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // typed helpers for UI
  const setGender = React.useCallback(
    (g?: Gender) => update({ gender: g }),
    [update]
  );

  return { prefs, update, reset, setGender };
}
