"use client";

import React, { useMemo } from "react";
import type { Preferences } from "@/lib/preferences/types";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/types";

export type Prefs = Preferences;

type Props = {
  value: Preferences;
  onChange: (v: Preferences) => void;
};

const GENDER_OPTIONS: Preferences["gender"][] = ["female", "male", "unisex", "unspecified"];

const TOP_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const BOTTOM_SIZES = ["24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34"];
const DRESS_SIZES = ["32", "34", "36", "38", "40", "42", "44", "46"];
const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41", "42", "43"];

const BUDGET_OPTIONS = [
  "<$150",
  "$150–$300",
  "$300–$600",
  "$600–$1000",
  "$1000+",
  "Luxury / couture",
];

const COUNTRY_OPTIONS = ["US", "UK", "EU", "NL", "FR", "DE", "IT", "ES", "CA", "AU", "UAE"];

const STYLE_LIBRARY = [
  "minimal",
  "old money",
  "elevated basics",
  "clean lines",
  "avant-garde",
  "romantic",
  "streetwear luxe",
  "bohemian",
  "color-pop",
  "power tailoring",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <header>
        <p className="text-[12px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--rt-muted)" }}>
          {title}
        </p>
      </header>
      {children}
    </section>
  );
}

export default function PreferencesPanel({ value, onChange }: Props) {
  const current = value || DEFAULT_PREFERENCES;

  const toggleKeyword = (keyword: string) => {
    const exists = current.styleKeywords.includes(keyword);
    const nextKeywords = exists
      ? current.styleKeywords.filter((k) => k !== keyword)
      : [...current.styleKeywords, keyword];
    onChange({ ...current, styleKeywords: nextKeywords });
  };

  const update = <K extends keyof Preferences>(key: K, val: Preferences[K]) => {
    onChange({ ...current, [key]: val });
  };

  const updateSize = (key: keyof Preferences["sizes"], val: string) => {
    onChange({ ...current, sizes: { ...current.sizes, [key]: val } });
  };

  const keywordSummary = useMemo(() => {
    if (!current.styleKeywords.length) return "Add descriptors";
    return current.styleKeywords.join(" · ");
  }, [current.styleKeywords]);

  return (
    <div className="card space-y-6 p-5" style={{ background: "white" }}>
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold tracking-tight">Your Preferences</h3>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--rt-charcoal)" }}>
          These flow into every request — zero retyping. Save to profile when signed in.
        </p>
      </div>

      <Section title="Gender & Silhouette">
        <select
          className="h-11 w-full rounded-full border px-4 text-[14px] focus:outline-none"
          style={{ borderColor: "var(--rt-border)", background: "white" }}
          value={current.gender}
          onChange={(e) => update("gender", e.target.value as Preferences["gender"])}
        >
          {GENDER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "unspecified" ? "No preference" : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Sizes">
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <label className="space-y-1">
            <span style={{ color: "var(--rt-charcoal)" }}>Top</span>
            <select
              className="h-10 w-full rounded-full border px-3"
              style={{ borderColor: "var(--rt-border)", background: "white" }}
              value={current.sizes.top || ""}
              onChange={(e) => updateSize("top", e.target.value)}
            >
              <option value="">Select</option>
              {TOP_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span style={{ color: "var(--rt-charcoal)" }}>Bottom (waist)</span>
            <select
              className="h-10 w-full rounded-full border px-3"
              style={{ borderColor: "var(--rt-border)", background: "white" }}
              value={current.sizes.bottom || ""}
              onChange={(e) => updateSize("bottom", e.target.value)}
            >
              <option value="">Select</option>
              {BOTTOM_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span style={{ color: "var(--rt-charcoal)" }}>Dress / suit</span>
            <select
              className="h-10 w-full rounded-full border px-3"
              style={{ borderColor: "var(--rt-border)", background: "white" }}
              value={current.sizes.dress || ""}
              onChange={(e) => updateSize("dress", e.target.value)}
            >
              <option value="">Select</option>
              {DRESS_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span style={{ color: "var(--rt-charcoal)" }}>Shoe (EU)</span>
            <select
              className="h-10 w-full rounded-full border px-3"
              style={{ borderColor: "var(--rt-border)", background: "white" }}
              value={current.sizes.shoe || ""}
              onChange={(e) => updateSize("shoe", e.target.value)}
            >
              <option value="">Select</option>
              {SHOE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <label className="space-y-1">
            <span style={{ color: "var(--rt-charcoal)" }}>Height</span>
            <input
              className="h-10 w-full rounded-full border px-3"
              style={{ borderColor: "var(--rt-border)", background: "white" }}
              placeholder="e.g., 170 cm"
              value={current.height || ""}
              onChange={(e) => update("height", e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span style={{ color: "var(--rt-charcoal)" }}>Weight</span>
            <input
              className="h-10 w-full rounded-full border px-3"
              style={{ borderColor: "var(--rt-border)", background: "white" }}
              placeholder="optional"
              value={current.weight || ""}
              onChange={(e) => update("weight", e.target.value)}
            />
          </label>
        </div>
      </Section>

      <Section title="Body Type">
        <select
          className="h-11 w-full rounded-full border px-4 text-[14px]"
          style={{ borderColor: "var(--rt-border)", background: "white" }}
          value={current.bodyType}
          onChange={(e) => update("bodyType", e.target.value)}
        >
          <option value="">Select body balance</option>
          <option value="hourglass">Hourglass</option>
          <option value="pear">Pear</option>
          <option value="rectangle">Rectangle</option>
          <option value="inverted-triangle">Inverted triangle</option>
          <option value="apple">Apple</option>
          <option value="petite">Petite</option>
          <option value="tall">Tall</option>
          <option value="plus">Plus</option>
        </select>
      </Section>

      <Section title="Budget & Region">
        <div className="grid grid-cols-2 gap-3">
          <select
            className="h-11 w-full rounded-full border px-4 text-[14px]"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={current.budget}
            onChange={(e) => update("budget", e.target.value)}
          >
            <option value="">Select range</option>
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <select
            className="h-11 w-full rounded-full border px-4 text-[14px]"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            value={current.country}
            onChange={(e) => update("country", e.target.value)}
          >
            <option value="">Select market</option>
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Style Keywords">
        <div className="flex flex-wrap gap-2">
          {STYLE_LIBRARY.map((keyword) => {
            const active = current.styleKeywords.includes(keyword);
            return (
              <button
                key={keyword}
                type="button"
                onClick={() => toggleKeyword(keyword)}
                className={`rounded-full px-3 py-1 text-[12px] transition ${
                  active ? "bg-black text-white" : "border"
                }`}
                style={
                  active
                    ? undefined
                    : { borderColor: "var(--rt-border)", background: "var(--rt-ivory)" }
                }
              >
                {keyword}
              </button>
            );
          })}
        </div>
        <p className="text-[12px]" style={{ color: "var(--rt-charcoal)" }}>
          {keywordSummary}
        </p>
        <label className="block text-[12px]" style={{ color: "var(--rt-charcoal)" }}>
          Custom tags
          <input
            className="mt-1 h-10 w-full rounded-full border px-3 text-[13px]"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            placeholder="comma-separated adjectives"
            value={current.styleKeywords.filter((word) => !STYLE_LIBRARY.includes(word)).join(", ")}
            onChange={(e) => {
              const manual = e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
              const curated = current.styleKeywords.filter((word) => STYLE_LIBRARY.includes(word));
              onChange({ ...current, styleKeywords: [...new Set([...curated, ...manual])] });
            }}
          />
        </label>
      </Section>
    </div>
  );
}
