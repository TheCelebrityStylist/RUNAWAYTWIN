// FILE: app/stylist/page.tsx
"use client";

import * as React from "react";
import { useFavorites } from "@/lib/hooks/useFavorites";

/* ========================= Types ========================= */

type Gender = "female" | "male" | "other";

type Prefs = {
  gender?: Gender;
  bodyType?: string;
  budget?: string;
  country?: string;
  keywords?: string[];
  sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
};

type Msg = { role: "user" | "assistant"; content: string };

type UiCategory =
  | "Top"
  | "Bottom"
  | "Dress"
  | "Outerwear"
  | "Shoes"
  | "Bag"
  | "Accessory";

type UiProduct = {
  id: string;
  title: string;
  url: string | null;
  brand: string | null;
  affiliate_url: string | null;
  retailer: string | null;
  availability: string | null;
  category: UiCategory;
  price: number | null;
  currency: string;
  image: string | null;
};

type AiJson = {
  brief: string;
  tips: string[];
  why: string[];
  products: UiProduct[];
  total: { value: number | null; currency: string };
};

/* ===================== UI atoms/helpers ===================== */

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-600 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-gray-300 px-2 py-2 text-sm outline-none focus:border-gray-600 ${props.className ?? ""}`}
    />
  );
}

function proxyImage(src: string | null): string | null {
  if (!src) return null;
  const s = src.trim();
  if (!s) return null;
  if (s.startsWith("/")) return s;
  try {
    const u = new URL(s);
    return `/api/image?url=${encodeURIComponent(u.toString())}`;
  } catch {
    return null;
  }
}

/* ================== JSON coercion (matches /api/chat) ================== */

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asString(x: unknown, def = ""): string {
  return typeof x === "string" ? x : def;
}

function asNumberOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function normalizeCategory(raw: unknown): UiCategory {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  if (v.includes("dress")) return "Dress";
  if (v.includes("coat") || v.includes("jacket") || v.includes("trench"))
    return "Outerwear";
  if (v.includes("shoe") || v.includes("boot") || v.includes("sneaker") || v.includes("heel"))
    return "Shoes";
  if (v.includes("bag")) return "Bag";
  if (v.includes("top") || v.includes("shirt") || v.includes("tee") || v.includes("blouse"))
    return "Top";
  if (v.includes("trouser") || v.includes("pant") || v.includes("jean") || v.includes("skirt"))
    return "Bottom";
  return "Accessory";
}

function asProduct(x: unknown, fallbackCurrency: string): UiProduct | null {
  if (!isObj(x)) return null;

  const id = asString(x["id"], "");
  const title = asString(x["title"], "");
  if (!title) return null;

  const url =
    typeof x["url"] === "string" && x["url"].trim().length
      ? (x["url"] as string)
      : null;

  const brand =
    typeof x["brand"] === "string" && x["brand"].trim().length
      ? (x["brand"] as string)
      : null;

  const cat = normalizeCategory(x["category"]);
  const price = asNumberOrNull(x["price"]);

  const currency =
    typeof x["currency"] === "string" && x["currency"].trim().length
      ? (x["currency"] as string)
      : fallbackCurrency;

  const image =
    typeof x["image"] === "string" && x["image"].trim().length
      ? (x["image"] as string)
      : null;

  const affiliateUrl =
    typeof x["affiliate_url"] === "string" && x["affiliate_url"].trim().length
      ? (x["affiliate_url"] as string)
      : url;

  const retailer =
    typeof x["retailer"] === "string" && x["retailer"].trim().length
      ? (x["retailer"] as string)
      : null;

  const availability =
    typeof x["availability"] === "string" && x["availability"].trim().length
      ? (x["availability"] as string)
      : null;

  return {
    id: id || (url ?? title),
    title,
    url,
    brand,
    affiliate_url: affiliateUrl,
    retailer,
    availability,
    category: cat,
    price,
    currency,
    image,
  };
}

function coerceAiJson(content: string): AiJson | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;

  const brief = asString(raw["brief"], "");
  const tips = Array.isArray(raw["tips"])
    ? ((raw["tips"] as unknown[]).filter((s) => typeof s === "string") as string[])
    : [];
  const why = Array.isArray(raw["why"])
    ? ((raw["why"] as unknown[]).filter((s) => typeof s === "string") as string[])
    : [];

  const productsRaw = Array.isArray(raw["products"])
    ? (raw["products"] as unknown[])
    : [];
  const fallbackCurrency =
    (isObj(raw["total"]) &&
      typeof raw["total"]["currency"] === "string" &&
      raw["total"]["currency"]) ||
    "EUR";

  const products: UiProduct[] = productsRaw
    .map((p) => asProduct(p, fallbackCurrency))
    .filter((p): p is UiProduct => !!p);

  const totalObj = isObj(raw["total"])
    ? (raw["total"] as Record<string, unknown>)
    : {};
  const totalCurrency =
    typeof totalObj["currency"] === "string"
      ? (totalObj["currency"] as string)
      : fallbackCurrency;
  const totalValue = asNumberOrNull(totalObj["value"]);

  if (!brief && !tips.length && !why.length && !products.length) return null;

  return {
    brief,
    tips,
    why,
    products,
    total: { value: totalValue, currency: totalCurrency },
  };
}

/* ========================= Page ========================= */

const DEMOS = [
  `Zendaya at a Paris gala, sleek modern couture under €800`,
  `Taylor Russell at a gallery opening, rainy 16°C, sculptural tailoring`,
  `Timothée Chalamet smart-casual date, soft tailoring + boots`,
  `Hailey Bieber off-duty street, under €300, neutrals + leather`,
];

type Resolved = {
  url: string;
  affiliate_url?: string;
  image?: string;
  price?: number;
  currency?: string;
  retailer?: string;
  availability?: string;
  title?: string;
  brand?: string;
};

export default function StylistPage() {
  const [prefs, setPrefs] = React.useState<Prefs>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("rwt-prefs");
      if (raw) return JSON.parse(raw) as Prefs;
    } catch {}
    return {};
  });

  const updatePrefs = React.useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next: Prefs = {
        ...prev,
        ...patch,
        sizes: { ...(prev.sizes ?? {}), ...(patch.sizes ?? {}) },
      };
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("rwt-prefs", JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const sizes = prefs.sizes ?? {};
  const fav = useFavorites();

  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // Resolver cache: productId -> resolved real product
  const [resolved, setResolved] = React.useState<Record<string, Resolved>>({});

  const resolveProduct = React.useCallback(async (p: UiProduct) => {
    const key = p.id;
    if (resolved[key]) return;

    const q = `${p.brand ?? ""} ${p.title}`.trim();
    if (!q) return;

    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 1 }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; items?: Array<Record<string, unknown>> };
      const first = Array.isArray(data.items) ? data.items[0] : null;
      if (!first || typeof first.url !== "string" || !first.url) return;

      const next: Resolved = {
        url: first.url as string,
        affiliate_url: typeof first.affiliate_url === "string" ? (first.affiliate_url as string) : undefined,
        image: typeof first.image === "string" ? (first.image as string) : undefined,
        price: typeof first.price === "number" ? (first.price as number) : undefined,
        currency: typeof first.currency === "string" ? (first.currency as string) : undefined,
        retailer: typeof first.retailer === "string" ? (first.retailer as string) : undefined,
        availability: typeof first.availability === "string" ? (first.availability as string) : undefined,
        title: typeof first.title === "string" ? (first.title as string) : undefined,
        brand: typeof first.brand === "string" ? (first.brand as string) : undefined,
      };

      setResolved((cur) => ({ ...cur, [key]: next }));
    } catch {
      // ignore
    }
  }, [resolved]);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const nextMsgs: Msg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMsgs);
      setInput("");
      setSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMsgs,
            preferences: {
              gender: prefs.gender,
              bodyType: prefs.bodyType,
              budget: prefs.budget,
              country: prefs.country,
              styleKeywords: (prefs.keywords || []).join(", "),
              sizeTop: sizes.top,
              sizeBottom: sizes.bottom,
              sizeDress: sizes.dress,
              sizeShoe: sizes.shoe,
            },
          }),
        });

        const replyText = await res.text();
        setMessages((curr) => [...curr, { role: "assistant", content: replyText }]);
      } catch {
        const fallback: AiJson = {
          brief:
            "I hit a connectivity issue. Here is a capsule-based fallback look while we recover.",
          tips: [
            "Keep to one or two base colors for high remix value.",
            "Use one structured piece to sharpen the silhouette.",
          ],
          why: [
            "These cuts flatter varied body types.",
            "Each item can rotate across multiple outfits.",
          ],
          products: [],
          total: { value: null, currency: "EUR" },
        };
        setMessages((curr) => [...curr, { role: "assistant", content: JSON.stringify(fallback) }]);
      } finally {
        setSending(false);
      }
    },
    [messages, prefs, sizes, sending]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  // When a new assistant message arrives, trigger resolution for any weak products.
  React.useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const ai = coerceAiJson(last.content);
    if (!ai) return;

    for (const p of ai.products) {
      // resolve if missing url OR missing image OR missing price
      if (!p.url || !p.image || p.price == null) {
        void resolveProduct(p);
      }
    }
  }, [messages, resolveProduct]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {DEMOS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setInput(d)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[11px] font-medium hover:bg-gray-50"
          >
            {d}
          </button>
        ))}
        <a
          href="/looks"
          className="ml-auto inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-[11px] font-semibold hover:bg-gray-50"
        >
          View Lookboard ({fav.list.length})
        </a>
      </div>

      <section className="sticky top-14 z-10 mb-6 grid gap-3 rounded-2xl border bg-white/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Your fit & context</p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="col-span-1">
            <Select
              aria-label="Gender"
              value={prefs.gender ?? ""}
              onChange={(e) =>
                updatePrefs({
                  gender: (e.target.value || undefined) as Gender | undefined,
                })
              }
            >
              <option value="">Gender</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="col-span-2 md:col-span-2">
            <TextInput
              aria-label="Body type"
              placeholder="pear / hourglass / apple / rectangle"
              value={prefs.bodyType ?? ""}
              onChange={(e) => updatePrefs({ bodyType: e.target.value || undefined })}
            />
          </div>

          <div className="col-span-1">
            <TextInput
              aria-label="Budget band"
              placeholder="e.g. 150-300 per look"
              value={prefs.budget ?? ""}
              onChange={(e) => updatePrefs({ budget: e.target.value || undefined })}
            />
          </div>

          <div className="col-span-1">
            <TextInput
              aria-label="Country"
              placeholder="NL / US / UK…"
              value={prefs.country ?? ""}
              onChange={(e) => updatePrefs({ country: e.target.value || undefined })}
            />
          </div>

          <div className="col-span-2 md:col-span-2">
            <TextInput
              aria-label="Style keywords"
              placeholder="minimal, monochrome, soft tailoring"
              value={(prefs.keywords ?? []).join(", ")}
              onChange={(e) =>
                updatePrefs({
                  keywords: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <TextInput
            aria-label="Top size"
            placeholder="Top"
            value={sizes.top ?? ""}
            onChange={(e) => updatePrefs({ sizes: { ...sizes, top: e.target.value || undefined } })}
          />
          <TextInput
            aria-label="Bottom size"
            placeholder="Bottom"
            value={sizes.bottom ?? ""}
            onChange={(e) =>
              updatePrefs({ sizes: { ...sizes, bottom: e.target.value || undefined } })
            }
          />
          <TextInput
            aria-label="Dress size"
            placeholder="Dress"
            value={sizes.dress ?? ""}
            onChange={(e) =>
              updatePrefs({ sizes: { ...sizes, dress: e.target.value || undefined } })
            }
          />
          <TextInput
            aria-label="Shoe size"
            placeholder="Shoe"
            value={sizes.shoe ?? ""}
            onChange={(e) => updatePrefs({ sizes: { ...sizes, shoe: e.target.value || undefined } })}
          />
        </div>
      </section>

      <section className="grid content-start gap-4 rounded-2xl border bg-white p-4">
        <p className="text-xs text-gray-700">
          Describe muse, occasion, weather, and constraints. The stylist uses your profile plus live products to build a shoppable look.
        </p>

        <div className="grid gap-3">
          {messages.map((m, i) => {
            const ai = m.role === "assistant" ? coerceAiJson(m.content) : null;

            return (
              <div
                key={i}
                className={`rounded-2xl border p-3 text-sm ${m.role === "user" ? "bg-gray-50" : "bg-white"}`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                  {m.role === "user" ? "You" : "RunwayTwin Stylist"}
                </p>

                {ai ? (
                  <div className="grid gap-3">
                    <p className="text-gray-900">{ai.brief}</p>

                    <div className="inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-[10px] text-gray-700">
                      <span>Est. total (if priced):</span>
                      <span className="font-semibold">
                        {ai.total.value != null ? `${ai.total.currency} ${ai.total.value}` : "—"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {ai.products.map((p) => {
                        const r = resolved[p.id];
                        const url = r?.affiliate_url ?? r?.url ?? p.affiliate_url ?? p.url;
                        const img = proxyImage(r?.image ?? p.image);
                        const title = r?.title ?? p.title;
                        const brand = r?.brand ?? p.brand;
                        const price = r?.price ?? p.price;
                        const currency = r?.currency ?? p.currency;
                        const retailer = r?.retailer ?? p.retailer;
                        const availability = r?.availability ?? p.availability;

                        const favPayload = {
                          id: p.id,
                          title,
                          url: url ?? undefined,
                          image: img ?? undefined,
                          brand: brand ?? undefined,
                          category: p.category,
                          price: price ?? undefined,
                          currency: currency ?? undefined,
                          retailer: retailer ?? undefined,
                        };

                        const saved = fav.has(favPayload);

                        return (
                          <article key={p.id} className="group flex flex-col rounded-2xl border p-3">
                            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={img}
                                  alt={title}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                  loading="lazy"
                                />
                              ) : null}
                              <button
                                type="button"
                                onClick={() => fav.toggle(favPayload)}
                                className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-semibold shadow-sm ${
                                  saved
                                    ? "bg-black text-white"
                                    : "bg-white/90 text-black border border-gray-200"
                                }`}
                              >
                                {saved ? "Saved" : "Save"}
                              </button>
                            </div>

                            <h3 className="mt-2 line-clamp-2 text-xs font-semibold text-gray-900">
                              {title}
                            </h3>
                            <p className="text-[10px] text-gray-500">
                              {brand ?? "—"} • {p.category}
                            </p>

                            <div className="mt-1 text-[10px] text-gray-800">
                              {price != null ? `${currency} ${price}` : "Price at retailer"}
                            </div>

                            <div className="mt-2 flex gap-2">
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex flex-1 items-center justify-center rounded-lg border px-2 py-1 text-[10px] font-medium hover:bg-gray-50"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="inline-flex flex-1 items-center justify-center rounded-lg border px-2 py-1 text-[9px] text-gray-500">
                                  Resolving…
                                </span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    {(ai.why.length > 0 || ai.tips.length > 0) && (
                      <div className="grid gap-2 pt-2">
                        {ai.tips.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold">The Look</p>
                            <ul className="list-disc pl-5 text-xs text-gray-700">
                              {ai.tips.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {ai.why.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold">Why this works</p>
                            <ul className="list-disc pl-5 text-xs text-gray-700">
                              {ai.why.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-gray-800">{m.content}</p>
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe a look..."
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}
