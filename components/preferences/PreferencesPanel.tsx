// components/preferences/PreferencesPanel.tsx
"use client";

import React from "react";

// FILE: components/preferences/PreferencesPanel.tsx
export type Prefs = import("../useStylistChat").Prefs; // <— guarantees the same shape

type Props = {
  value: Prefs;
  onChange: (v: Prefs) => void;
};

export default function PreferencesPanel({ value, onChange }: Props) {
  const update = <K extends keyof Prefs>(key: K, next: Prefs[K]) =>
    onChange({ ...value, [key]: next });

  const updateSize = (k: keyof Prefs["sizes"], v: string) =>
    onChange({ ...value, sizes: { ...value.sizes, [k]: v } });

  const onKeywords = (v: string) =>
    update("styleKeywords", v.split(",").map((x) => x.trim()).filter(Boolean));

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-[15px]">Your Preferences</h3>

      <div className="space-y-2">
        <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Gender</label>
        <select
          className="h-10 rounded-full border px-3 text-[14px] w-full"
          style={{ borderColor: "var(--rt-border)", background: "white" }}
          value={value.gender}
          onChange={(e) =>
            update("gender", e.target.value as Prefs["gender"])
          }
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="unisex">Unisex</option>
          <option value="unspecified">Unspecified</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Top</label>
          <input
            className="h-10 rounded-full border px-3 text-[14px] w-full"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={value.sizes.top || ""}
            onChange={(e) => updateSize("top", e.target.value)}
            placeholder="e.g., M"
          />
        </div>
        <div>
          <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Bottom</label>
          <input
            className="h-10 rounded-full border px-3 text-[14px] w-full"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={value.sizes.bottom || ""}
            onChange={(e) => updateSize("bottom", e.target.value)}
            placeholder="e.g., 28"
          />
        </div>
        <div>
          <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Dress</label>
          <input
            className="h-10 rounded-full border px-3 text-[14px] w-full"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={value.sizes.dress || ""}
            onChange={(e) => updateSize("dress", e.target.value)}
            placeholder="e.g., 38"
          />
        </div>
        <div>
          <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Shoe</label>
          <input
            className="h-10 rounded-full border px-3 text-[14px] w-full"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={value.sizes.shoe || ""}
            onChange={(e) => updateSize("shoe", e.target.value)}
            placeholder="e.g., 39"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Body Type</label>
        <select
          className="h-10 rounded-full border px-3 text-[14px] w-full"
          style={{ borderColor: "var(--rt-border)", background: "white" }}
          value={value.bodyType}
          onChange={(e) => update("bodyType", e.target.value)}
        >
          <option value="">Select…</option>
          <option value="hourglass">Hourglass</option>
          <option value="pear">Pear</option>
          <option value="rectangle">Rectangle</option>
          <option value="inverted-triangle">Inverted triangle</option>
          <option value="petite">Petite</option>
          <option value="tall">Tall</option>
          <option value="plus">Plus</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Budget</label>
          <input
            className="h-10 rounded-full border px-3 text-[14px] w-full"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={value.budget}
            onChange={(e) => update("budget", e.target.value)}
            placeholder="e.g., €300–€600"
          />
        </div>
        <div>
          <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Country</label>
          <input
            className="h-10 rounded-full border px-3 text-[14px] w-full"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={value.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="e.g., NL / US"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>Style Keywords</label>
        <input
          className="h-10 rounded-full border px-3 text-[14px] w-full"
          style={{ borderColor: "var(--rt-border)", background: "white" }}
          value={value.styleKeywords.join(", ")}
          onChange={(e) => onKeywords(e.target.value)}
          placeholder="e.g., minimal, elevated basics, clean lines"
        />
        <p className="text-[11px]" style={{ color: "var(--rt-muted)" }}>
          Comma-separated. Used to guide palette and silhouette choices.
        </p>
      </div>
    </div>
  );
}
