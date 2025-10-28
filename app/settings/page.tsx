// FILE: app/settings/page.tsx
"use client";

import * as React from "react";
import { usePrefs } from "@/lib/hooks/usePrefs";
import type { Gender } from "@/lib/types";

const GENDERS: Gender[] = ["female", "male"]; // aligned with Prefs.gender
const BODIES = ["hourglass", "pear", "apple", "rectangle", "inverted-triangle", "athletic"] as const;

export default function SettingsPage() {
  const { prefs, update, reset } = usePrefs();
  const [keywords, setKeywords] = React.useState<string>((prefs.keywords ?? []).join(", "));

  // Keep local input in sync when prefs change externally
  React.useEffect(() => {
    setKeywords((prefs.keywords ?? []).join(", "));
  }, [prefs.keywords]);

  const onSaveKeywords = () => {
    const arr = keywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update({ keywords: arr });
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Preferences</h1>
        <p className="text-sm text-gray-600">
          These settings guide search, ranking, and styling. Changes are saved to your device.
        </p>
      </header>

      <section className="grid gap-6">
        {/* Gender */}
        <fieldset className="rounded-2xl border bg-white p-4">
          <legend className="mb-3 text-sm font-semibold">Gender</legend>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <label key={g} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={prefs.gender === g}
                  onChange={() => update({ gender: g })}
                />
                <span className="text-sm capitalize">{g}</span>
              </label>
            ))}
            <button
              type="button"
              className="ml-2 rounded-xl border px-2 py-1 text-xs hover:bg-gray-50"
              onClick={() => update({ gender: undefined })}
            >
              Clear
            </button>
          </div>
        </fieldset>

        {/* Body type */}
        <fieldset className="rounded-2xl border bg-white p-4">
          <legend className="mb-3 text-sm font-semibold">Body type</legend>
          <div className="flex flex-wrap gap-2">
            {BODIES.map((b) => (
              <label key={b} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="bodyType"
                  value={b}
                  checked={prefs.bodyType === b}
                  onChange={() => update({ bodyType: b })}
                />
                <span className="text-sm capitalize">{b.replace("-", " ")}</span>
              </label>
            ))}
            <button
              type="button"
              className="ml-2 rounded-xl border px-2 py-1 text-xs hover:bg-gray-50"
              onClick={() => update({ bodyType: undefined })}
            >
              Clear
            </button>
          </div>
        </fieldset>

        {/* Country & Budget */}
        <div className="grid gap-4 rounded-2xl border bg-white p-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="country" className="text-sm font-semibold">
              Country (ISO-2)
            </label>
            <input
              id="country"
              placeholder="e.g., NL, US, GB, JP"
              value={prefs.country ?? ""}
              onChange={(e) => update({ country: e.target.value.toUpperCase() || undefined })}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
            />
            <p className="text-xs text-gray-500">
              Used to infer currency for ranking (e.g., NL → EUR, US → USD).
            </p>
          </div>

          <div className="grid gap-2">
            <label htmlFor="budget" className="text-sm font-semibold">
              Budget (range or single)
            </label>
            <input
              id="budget"
              placeholder="€120–€200 or 150"
              value={prefs.budget ?? ""}
              onChange={(e) => update({ budget: e.target.value || undefined })}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
            />
            <p className="text-xs text-gray-500">
              Free text accepted; the ranker extracts numbers and averages if a range.
            </p>
          </div>
        </div>

        {/* Keywords */}
        <div className="rounded-2xl border bg-white p-4">
          <label htmlFor="keywords" className="mb-2 block text-sm font-semibold">
            Keywords (comma separated)
          </label>
          <div className="flex gap-2">
            <input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="minimal, streetwear, soft tailoring"
              className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
            />
            <button
              type="button"
              onClick={onSaveKeywords}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-black/60"
            >
              Save
            </button>
          </div>
        </div>

        {/* Sizes */}
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Sizes</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <SizeInput
              label="Top"
              value={prefs.sizes?.top}
              onChange={(v) => update({ sizes: { ...(prefs.sizes ?? {}), top: v || undefined } })}
            />
            <SizeInput
              label="Bottom"
              value={prefs.sizes?.bottom}
              onChange={(v) =>
                update({ sizes: { ...(prefs.sizes ?? {}), bottom: v || undefined } })
              }
            />
            <SizeInput
              label="Dress"
              value={prefs.sizes?.dress}
              onChange={(v) =>
                update({ sizes: { ...(prefs.sizes ?? {}), dress: v || undefined } })
              }
            />
            <SizeInput
              label="Shoe"
              value={prefs.sizes?.shoe}
              onChange={(v) => update({ sizes: { ...(prefs.sizes ?? {}), shoe: v || undefined } })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Reset to defaults
          </button>
        </div>

        {/* Preview */}
        <details className="rounded-2xl border bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">Preview JSON</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-700">
            {JSON.stringify(prefs, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  );
}

function SizeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-xs font-medium">{label}</label>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label === "Shoe" ? "39" : "M / 28 / 38"}
        className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
      />
    </div>
  );
}

