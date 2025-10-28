// FILE: lib/hooks/usePrefs.ts
"use client";

import * as React from "react";
import type { Prefs } from "@/lib/types";

const KEY = "rwt-prefs";

const DEFAULT: Prefs = {
  gender: undefined,
  bodyType: undefined,
  budget: undefined,
  country: undefined,
  currency: undefined,
  keywords: [],
  sizes: {
    top: undefined,
    bottom: undefined,
    dress: undefined,
    shoe: undefined,
  },
};

function mergePrefs(a?: Prefs, b?: Prefs): Prefs {
  const out: Prefs = { ...DEFAULT, ...(a ?? {}) };
  const add = b ?? {};
  out.gender = add.gender ?? out.gender;
  out.bodyType = add.bodyType ?? out.bodyType;
  out.budget = add.budget ?? out.budget;
  out.country = add.country ?? out.country;
  out.currency = add.currency ?? out.currency;
  out.keywords = Array.isArray(add.keywords) ? add.keywords : out.keywords;
  out.sizes = { ...(out.sizes ?? {}), ...(add.sizes ?? {}) };
 
