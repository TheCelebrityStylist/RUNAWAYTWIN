// FILE: app/stylist/page.tsx
"use client";

import * as React from "react";
import type { Prefs, Gender, Msg } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

/* =============================================================================
   Types for JSON replies (lenient so we accept various shapes)
============================================================================= */

type AIProduct = {
  id?: string | number | null;
  title: string;
  brand?: string | null;
  category?: string | null;
  price?: number | string | null;
  currency?: string | null;
  image?: string | null;
  url: string;
};

type AILookJSON = {
  brief?: string;
  why?: string | string[];
  tips?: string | string[];
  products?: AIProduct[];
  total?: { value?: number | string; currency?: string } | number | string;
};

/* =============================================================================
   Defaults
============================================================================= */

const DEFAULT_PREFS: Prefs = {
  gender: undefined,
  bodyType: undefined,
  budget: undefined,
  country: undefined,
  keywords: [],
  sizes: { top: undefined, bottom: undefined, dress: undefined, shoe: undefined },
};

const DEMOS = [
  `Zendaya for a gala in Paris`,
  `Taylor Russell — gallery opening, rainy 16°C`,
  `Timothée Chalamet — smart casual date`,
  `Hailey Bieber — street style, under €300`,
];

/* =============================================================================
   Small UI atoms
============================================================================= */

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-gray-300 px-2 py-2 text-sm outline-none focus:border-gray-500 ${props.className ?? ""}`}
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-gray-700">{children}</label>;
}

/* =============================================================================
   JSON look renderer
============================================================================= */

function isJsonLook(s: string): AILookJSON | null {
  try {
    const obj = JSON.parse(s) as unknown;
    if (obj && typeof obj === "object" && Array.isArray((obj as AILookJSON).products)) {
      return obj as AILookJSON;
    }
    return null;
  } catch {
    return null;
  }
}

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

function totalFrom(obj: AILookJSON): { value: number | null; currency: string | null } {
  // prefer explicit total field
  if (typeof obj.total === "number") return { value: obj.total, currency: null };
  if (typeof obj.total === "string") {
    return { value: toNum(obj.total), currency: null };
  }
  if (obj.total && typeof obj.total === "object") {
    return { value: toNum(obj.total.value ?? null), currency: obj.total.currency ?? null };
  }
  // else sum product prices
  const sum = (obj.products || [])
    .map((p) => toNum(p.price ?? null))
    .filter((n): n is number => typeof n === "number")
    .reduce((a, b) => a + b, 0);
  const currency =
    (obj.products || []).find((p) => p.currency)?.currency ??
    (typeof obj.total === "object" && obj.total ? obj.total.currency ?? null : null);
  return { value: sum || null, currency: currency ?? null };
}

function LookRenderer({ data }: { data: AILookJSON }) {
  const total = totalFrom(data);
  return (
    <div className="grid gap-4">
      {(data.brief || data.why || data.tips) && (
        <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-800">
          {data.brief && <p className="mb-2">{data.brief}</p>}
          {data.why && (
            <>
              <p className="mt-2 font-semibold">Why this works</p>
              <ul className="ml-5 list-disc">
                {(Array.isArray(data.why) ? data.why : [data.why]).map((x, i) => (
                  <li key={`why-${i}`}>{x}</li>
                ))}
              </ul>
            </>
          )}
          {data.tips && (
            <>
              <p className="mt-2 font-semibold">Styling & capsule tips</p>
              <ul className="ml-5 list-disc">
                {(Array.isArray(data.tips) ? data.tips : [data.tips]).map((x, i) => (
                  <li key={`tip-${i}`}>{x}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
          Total:{" "}
          {total.value != null
            ? ` ${total.currency ?? "€"} ${total.value.toFixed(0)}`
            : " —"}
        </span>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(data.products || []).map((p, idx) => (
          <ProductCard
            key={`${p.id ?? idx}-${p.url}`}
            item={{
              id: String(p.id ?? idx),
              title: p.title,
              brand: p.brand ?? null,
              price: toNum(p.price) ?? null,
              currency: p.currency ?? null,
              image: p.image ?? null,
              url: p.url,
              retailer: null,
              category: p.category ?? null,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* =============================================================================
   Preferences panel
============================================================================= */

function PreferencesPanel({
  prefs,
  update,
}: {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
}) {
  const sizes = prefs.sizes ?? {};

  return (
    <section className="grid gap-3 rounded-2xl border bg-white p-4">
      <p className="text-sm font-semibold">Preferences</p>

      {/* Gender */}
      <div className="grid gap-1">
        <Label>Gender</Label>
        <Select
          value={prefs.gender ?? ""}
          onChange={(e) => update({ gender: (e.target.value || undefined) as Gender | undefined })}
        >
          <option value="">—</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </Select>
      </div>

      {/* Body type / Budget / Country */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label>Body type</Label>
          <TextInput
            placeholder="pear / hourglass / apple / rectangle"
            value={prefs.bodyType ?? ""}
            onChange={(e) => update({ bodyType: e.target.value || undefined })}
          />
        </div>
        <div className="grid gap-1">
          <Label>Budget band</Label>
          <TextInput
            placeholder="high-street / mid / luxury or a number"
            value={String(prefs.budget ?? "")}
            onChange={(e) => update({ budget: e.target.value || undefined })}
          />
        </div>
        <div className="grid gap-1">
          <Label>Country (ISO-2 or name)</Label>
          <TextInput
            placeholder="NL / US / UK / France…"
            value={prefs.country ?? ""}
            onChange={(e) => update({ country: e.target.value || undefined })}
          />
        </div>
      </div>

      {/* Sizes */}
      <div className="grid gap-1">
        <Label>Sizes (optional)</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TextInput
            placeholder="Top"
            value={sizes.top ?? ""}
            onChange={(e) =>
              update({ sizes: { ...sizes, top: e.target.value || undefined } })
            }
          />
          <TextInput
            placeholder="Bottom"
            value={sizes.bottom ?? ""}
            onChange={(e) =>
              update({ sizes: { ...sizes, bottom: e.target.value || undefined } })
            }
          />
          <TextInput
            placeholder="Dress"
            value={sizes.dress ?? ""}
            onChange={(e) =>
              update({ sizes: { ...sizes, dress: e.target.value || undefined } })
            }
          />
          <TextInput
            placeholder="Shoe"
            value={sizes.shoe ?? ""}
            onChange={(e) =>
              update({ sizes: { ...sizes, shoe: e.target.value || undefined } })
            }
          />
        </div>
      </div>

      {/* Keywords */}
      <div className="grid gap-1">
        <Label>Style keywords (comma-separated)</Label>
        <TextInput
          placeholder="minimal, monochrome, soft tailoring"
          value={(prefs.keywords ?? []).join(", ")}
          onChange={(e) =>
            update({
              keywords: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </section>
  );
}

/* =============================================================================
   Page
============================================================================= */

export default function StylistPage() {
  const [prefs, setPrefs] = React.useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem("rwt-prefs");
      if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Prefs) };
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_PREFS };
  });

  const updatePrefs = React.useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch, sizes: { ...(p.sizes ?? {}), ...(patch.sizes ?? {}) } };
      try {
        localStorage.setItem("rwt-prefs", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const nextMsgs: Msg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMsgs);
      setInput("");
      setSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMsgs, preferences: prefs }),
        });
        const reply = await res.text();
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "I hit a hiccup finishing the look. Please try again, or tweak your prompt.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, prefs]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Demo chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {DEMOS.map((d) => (
          <button
            key={d}
            onClick={() => setInput(d)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50"
          >
            {d}
          </button>
        ))}
      </div>

      {/* Layout: left chat, right prefs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.6fr_1fr]">
        {/* Chat */}
        <section className="grid content-start gap-4 rounded-2xl border bg-white p-4">
          <p className="text-sm text-gray-700">
            Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes,
            and capsule tips.
          </p>

          <div className="grid gap-3">
            {messages.map((m, i) => {
              if (m.role === "assistant") {
                const parsed = isJsonLook(m.content);
                if (parsed) {
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border bg-white p-3 text-sm text-neutral-800"
                    >
                      <LookRenderer data={parsed} />
                    </div>
                  );
                }
              }
              // Fallback bubble (user or non-JSON assistant)
              return (
                <div
                  key={i}
                  className={`whitespace-pre-wrap rounded-xl border p-3 text-sm ${
                    m.role === "user" ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                    {m.role}
                  </p>
                  <div>{m.content}</div>
                </div>
              );
            })}
          </div>

          <form onSubmit={onSubmit} className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`"Zendaya, Paris gallery opening, 18°C drizzle, smart-casual"`}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        </section>

        {/* Preferences */}
        <PreferencesPanel prefs={prefs} update={updatePrefs} />
      </div>
    </main>
  );
}

