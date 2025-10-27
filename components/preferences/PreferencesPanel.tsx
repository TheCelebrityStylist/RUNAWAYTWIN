// FILE: components/preferences/PreferencesPanel.tsx
"use client";

import React from "react";
import type { Prefs, Sizes, Gender } from "@/lib/types";

type Props = {
  value: Prefs;
  onChange: (next: Prefs) => void;
};

export default function PreferencesPanel({ value, onChange }: Props) {
  const onField = <K extends keyof Prefs>(key: K, next: NonNullable<Prefs[K]>) => {
    onChange({ ...value, [key]: next });
  };

  const ensureSizes = (s?: Sizes): Sizes => (s ? s : {});

  const updateSize = (k: keyof Sizes, v: string) => {
    const nextSizes: Sizes = { ...ensureSizes(value.sizes), [k]: v };
    onChange({ ...value, sizes: nextSizes });
  };

  const onKeywords = (v: string) => {
    const arr = v
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onChange({ ...value, keywords: arr });
  };

  return (
    <section className="grid gap-4 rounded-xl border p-4 md:p-6">
      <h2 className="text-lg font-semibold">Your Preferences</h2>

      {/* Gender */}
      <div className="grid gap-2">
        <label htmlFor="gender" className="text-sm font-medium">
          Gender
        </label>
        <select
          id="gender"
          className="rounded-md border px-3 py-2"
          value={value.gender ?? ""}
          onChange={(e) => onField("gender", e.target.value as Gender)}
        >
          <option value="">Select…</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Body Type */}
      <div className="grid gap-2">
        <label htmlFor="bodyType" className="text-sm font-medium">
          Body type
        </label>
        <input
          id="bodyType"
          className="rounded-md border px-3 py-2"
          placeholder="hourglass, athletic, petite…"
          value={value.bodyType ?? ""}
          onChange={(e) => onField("bodyType", e.target.value)}
        />
      </div>

      {/* Budget */}
      <div className="grid gap-2">
        <label htmlFor="budget" className="text-sm font-medium">
          Budget
        </label>
        <input
          id="budget"
          className="rounded-md border px-3 py-2"
          placeholder="€300–€600"
          value={value.budget ?? ""}
          onChange={(e) => onField("budget", e.target.value)}
        />
      </div>

      {/* Country */}
      <div className="grid gap-2">
        <label htmlFor="country" className="text-sm font-medium">
          Country
        </label>
        <input
          id="country"
          className="rounded-md border px-3 py-2"
          placeholder="NL"
          value={value.country ?? ""}
          onChange={(e) => onField("country", e.target.value)}
        />
      </div>

      {/* Sizes (optional) */}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Sizes (optional)</legend>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <input
            aria-label="Top size"
            className="rounded-md border px-3 py-2"
            placeholder="Top (e.g., M)"
            value={value.sizes?.top ?? ""}
            onChange={(e) => updateSize("top", e.target.value)}
          />
          <input
            aria-label="Bottom size"
            className="rounded-md border px-3 py-2"
            placeholder="Bottom (e.g., 28)"
            value={value.sizes?.bottom ?? ""}
            onChange={(e) => updateSize("bottom", e.target.value)}
          />
          <input
            aria-label="Dress size"
            className="rounded-md border px-3 py-2"
            placeholder="Dress (e.g., 38)"
            value={value.sizes?.dress ?? ""}
            onChange={(e) => updateSize("dress", e.target.value)}
          />
          <input
            aria-label="Shoe size"
            className="rounded-md border px-3 py-2"
            placeholder="Shoe (e.g., 39)"
            value={value.sizes?.shoe ?? ""}
            onChange={(e) => updateSize("shoe", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Keywords */}
      <div className="grid gap-2">
        <label htmlFor="keywords" className="text-sm font-medium">
          Style keywords (comma-separated)
        </label>
        <input
          id="keywords"
          className="rounded-md border px-3 py-2"
          placeholder="minimalist, streetwear, neutral tones…"
          value={(value.keywords ?? []).join(", ")}
          onChange={(e) => onKeywords(e.target.value)}
        />
      </div>
    </section>
  );
}
