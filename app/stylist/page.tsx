// FILE: app/stylist/page.tsx
"use client";

import * as React from "react";
import type { Prefs, Msg } from "@/lib/types";

type GenProduct = {
  id: string;
  title: string;
  brand: string;
  category: "top" | "bottom" | "outerwear" | "dress" | "shoes" | "bag" | "accessory";
  price: number;
  currency: "EUR" | "USD" | "GBP";
  image: string;
  url: string;
  retailer: string;
  notes: string;
};
type GenResponse =
  | {
      brief: string;
      why: string;
      tips: string[];
      products: GenProduct[];
      total: { value: number; currency: "EUR" | "USD" | "GBP" };
    }
  | { error: string };

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

function Price({ value, currency }: { value: number; currency: GenProduct["currency"] }) {
  const fmt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return <>{fmt.format(value)}</>;
}

function ProductCard({ p }: { p: GenProduct }) {
  return (
    <article className="group rounded-2xl border bg-white shadow-sm transition hover:shadow-md focus-within:shadow-md">
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[4/5] overflow-hidden rounded-t-2xl"
        aria-label={`${p.title} — open product`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={p.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
          {p.retailer}
        </div>
      </a>
      <div className="grid gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {p.brand} — {p.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span className="truncate capitalize">{p.category}</span>
          <span className="font-semibold text-neutral-900">
            <Price value={p.price} currency={p.currency} />
          </span>
        </div>
        <p className="text-xs text-neutral-600">{p.notes}</p>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center justify-center rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          View
        </a>
      </div>
    </article>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-neutral-700">{children}</label>;
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 ${props.className ?? ""}`}
    />
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-500 ${props.className ?? ""}`}
    />
  );
}

function PreferencesPanel({
  prefs,
  update,
}: {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
}) {
  const sizes = prefs.sizes ?? {};
  return (
    <aside className="w-full md:w-[340px] lg:w-[360px] xl:w-[380px]">
      <section className="sticky top-[76px] grid gap-3 rounded-2xl border bg-white p-4">
        <p className="text-sm font-semibold">Preferences</p>

        <div className="grid gap-1">
          <FieldLabel>Gender</FieldLabel>
          <Select
            value={prefs.gender ?? ""}
            onChange={(e) =>
              update({ gender: (e.target.value || undefined) as Prefs["gender"] })
            }
          >
            <option value="">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other / Mix</option>
          </Select>
        </div>

        <div className="grid gap-1">
          <FieldLabel>Body type</FieldLabel>
          <TextInput
            placeholder="pear / hourglass / apple / rectangle"
            value={prefs.bodyType ?? ""}
            onChange={(e) => update({ bodyType: e.target.value || undefined })}
          />
        </div>

        <div className="grid gap-1">
          <FieldLabel>Budget band</FieldLabel>
          <TextInput
            placeholder="high-street / mid / luxury or a number"
            value={(prefs.budget as string) ?? ""}
            onChange={(e) => update({ budget: e.target.value || undefined })}
          />
        </div>

        <div className="grid gap-1">
          <FieldLabel>Country (ISO-2 or name)</FieldLabel>
          <TextInput
            placeholder="NL / US / UK / France…"
            value={prefs.country ?? ""}
            onChange={(e) => update({ country: e.target.value || undefined })}
          />
        </div>

        <div className="grid gap-1">
          <FieldLabel>Sizes (optional)</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
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

        <div className="grid gap-1">
          <FieldLabel>Style keywords</FieldLabel>
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
    </aside>
  );
}

export default function StylistPage() {
  const [prefs, setPrefs] = React.useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem("rwt-prefs");
      if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Prefs) };
    } catch {}
    return { ...DEFAULT_PREFS };
  });
  const updatePrefs = React.useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch, sizes: { ...(p.sizes ?? {}), ...(patch.sizes ?? {}) } };
      try {
        localStorage.setItem("rwt-prefs", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [result, setResult] = React.useState<GenResponse | null>(null);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const nextMsgs: Msg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMsgs);
      setResult(null);
      setError(null);
      setSending(true);
      try {
        const res = await fetch(`/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMsgs, preferences: prefs }),
        });
        const json = (await res.json()) as GenResponse;

        if ("error" in json) {
          setError(json.error);
          setMessages((m) => [...m, { role: "assistant", content: "Error received." }]);
        } else {
          setResult(json);
          setMessages((m) => [...m, { role: "assistant", content: json.brief }]);
          if (!json.products?.length) setError("No products returned.");
        }
      } catch (e) {
        setError(String(e));
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "I hit a hiccup. Please try again." },
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {DEMOS.map((d) => (
          <button
            key={d}
            onClick={() => setInput(d)}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium hover:bg-neutral-50"
          >
            {d}
          </button>
        ))}
      </div>

      {/* Two columns: Left chat/results, Right prefs (fixed width) */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <section className="min-w-0 grid content-start gap-4 rounded-2xl border bg-white p-4">
          <p className="text-sm text-neutral-700">
            Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit
            notes, and capsule tips.
          </p>

          {/* Conversation */}
          <div className="grid gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap rounded-xl border p-3 text-sm ${
                  m.role === "user" ? "bg-neutral-50" : "bg-white"
                }`}
              >
                <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                  {m.role}
                </p>
                <div>{m.content}</div>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Loading */}
          {sending && (
            <div className="rounded-2xl border bg-neutral-50 p-3 text-sm text-neutral-700">
              Styling your look… fetching products…
            </div>
          )}

          {/* Lookbook */}
          {result && "products" in result && result.products?.length > 0 && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-neutral-700">{result.why}</p>
                <p className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-900">
                  Total:{" "}
                  <Price
                    value={Math.round(
                      (result as Extract<GenResponse, { products: GenProduct[] }>).total.value
                    )}
                    currency={
                      (result as Extract<GenResponse, { products: GenProduct[] }>).total.currency
                    }
                  />
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {result.products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-3 text-sm">
                <p className="font-medium">Capsule & styling tips</p>
                <ul className="mt-1 list-disc pl-5 text-neutral-700">
                  {result.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Prompt input */}
          <form onSubmit={onSubmit} className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`"Zendaya, Paris gallery opening, 18°C drizzle, smart-casual"`}
              className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
            >
              {sending ? "Styling…" : "Send"}
            </button>
          </form>
        </section>

        <PreferencesPanel prefs={prefs} update={updatePrefs} />
      </div>
    </main>
  );
}

