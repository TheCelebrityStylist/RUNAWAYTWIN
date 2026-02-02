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

type SlotName = "anchor" | "top" | "bottom" | "dress" | "shoe" | "accessory";

type StylePlan = {
  look_id: string;
  aesthetic_read: string;
  vibe_keywords: string[];
  required_slots: SlotName[];
  per_slot: Array<{
    slot: SlotName;
    category: string;
    keywords: string[];
    allowed_colors: string[];
    banned_materials: string[];
    min_price: number;
    max_price: number;
  }>;
  budget_split: Array<{ slot: SlotName; min: number; max: number }>;
  retailer_priority: string[];
  search_queries: Array<{ slot: SlotName; query: string }>;
  stylist_script: {
    opening_lines: string[];
    direction_line: string;
    loading_lines: string[];
    item_commentary_templates: Record<SlotName, string>;
  };
  budget_total: number;
  currency: string;
  allow_stretch: boolean;
  preferences: {
    gender?: string;
    body_type?: string;
    budget?: string;
    country?: string;
    keywords?: string[];
    sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
    prompt?: string;
  };
};

type LookProduct = {
  id: string;
  retailer: string;
  brand: string;
  title: string;
  price: number;
  currency: string;
  image_url: string;
  product_url: string;
  availability: "in_stock" | "out_of_stock" | "unknown";
  slot: SlotName;
  category: string;
};

type LookResponse = {
  look_id: string;
  status: "queued" | "running" | "partial" | "complete" | "failed";
  message: string;
  slots: LookProduct[];
  total_price: number | null;
  currency: string;
  missing_slots: SlotName[];
  note?: string;
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

/* ================== Style helpers ================== */

function normalizeCategory(raw: string): UiCategory {
  const v = raw.toLowerCase();
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

function buildPhaseOneMessage(prompt: string, plan: StylePlan): string {
  const opening = plan.stylist_script.opening_lines.join(" ");
  return [opening, plan.stylist_script.direction_line].join(" ");
}

function toUiProduct(item: LookProduct): UiProduct {
  return {
    id: item.id,
    title: item.title,
    url: item.product_url,
    brand: item.brand,
    affiliate_url: item.product_url,
    retailer: item.retailer,
    availability: item.availability,
    category: normalizeCategory(item.category),
    price: item.price,
    currency: item.currency,
    image: item.image_url,
  };
}

function slotSuggestion(slot: SlotName): string {
  switch (slot) {
    case "anchor":
      return "Swap: structured coat or sharp blazer.";
    case "top":
      return "Swap: clean knit or crisp shirt.";
    case "bottom":
      return "Swap: straight-leg trouser.";
    case "dress":
      return "Swap: slip dress in matte fabric.";
    case "shoe":
      return "Swap: pointed slingback or sleek boot.";
    case "accessory":
      return "Swap: minimal shoulder bag.";
    default:
      return "Swap: clean, tailored staple.";
  }
}

/* ========================= Page ========================= */

const DEMOS = [
  `Zendaya at a Paris gala, sleek modern couture under €800`,
  `Taylor Russell at a gallery opening, rainy 16°C, sculptural tailoring`,
  `Timothée Chalamet smart-casual date, soft tailoring + boots`,
  `Hailey Bieber off-duty street, under €300, neutrals + leather`,
];

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
  const [plan, setPlan] = React.useState<StylePlan | null>(null);
  const [look, setLook] = React.useState<LookResponse | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [polling, setPolling] = React.useState(false);
  const [searchingCopy, setSearchingCopy] = React.useState("Pulling pieces that fit the plan — stay with me.");
  const jobStartedAt = React.useRef<number | null>(null);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const nextMsgs: Msg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMsgs);
      setInput("");
      setSending(true);

      try {
        setLook(null);
        setPlan(null);
        setJobId(null);
        setPolling(false);

        const res = await fetch("/api/styleplan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            prefs: {
              gender: prefs.gender,
              bodyType: prefs.bodyType,
              budget: prefs.budget,
              country: prefs.country,
              keywords: prefs.keywords,
              sizes: {
                top: sizes.top,
                bottom: sizes.bottom,
                dress: sizes.dress,
                shoe: sizes.shoe,
              },
            },
          }),
        });

        const data = (await res.json()) as { ok?: boolean; plan?: StylePlan };
        if (!data.ok || !data.plan) {
          setMessages((curr) => [
            ...curr,
            {
              role: "assistant",
              content:
                "I hit a snag building the plan. Try tweaking the budget or adding a clearer occasion.",
            },
          ]);
          return;
        }

        const plan = data.plan;
        setPlan(plan);
        setMessages((curr) => [
          ...curr,
          { role: "assistant", content: buildPhaseOneMessage(trimmed, plan) },
        ]);

        const jobRes = await fetch("/api/look", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const jobData = (await jobRes.json()) as { ok?: boolean; job_id?: string };
        if (jobData.ok && jobData.job_id) {
          setJobId(jobData.job_id);
          setPolling(true);
          jobStartedAt.current = Date.now();
          setSearchingCopy(plan.stylist_script.loading_lines[0] || "Pulling the anchor first.");
        }
      } catch {
        setMessages((curr) => [
          ...curr,
          {
            role: "assistant",
            content:
              "I hit a connectivity issue. Try again in a moment and I’ll build the plan cleanly.",
          },
        ]);
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

  React.useEffect(() => {
    if (!polling || !jobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/look/${jobId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; status?: LookResponse["status"]; result?: LookResponse };
        if (!data.ok || !data.result) return;
        if (cancelled) return;
        setLook(data.result);
        if (data.status === "complete" || data.status === "failed" || data.status === "partial") {
          setPolling(false);
        }
      } catch {
        // ignore
      }
    };

    const interval = setInterval(poll, 600);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [polling, jobId]);

  React.useEffect(() => {
    if (!polling || !jobStartedAt.current) return;
      const timer = setInterval(() => {
        const elapsed = Date.now() - (jobStartedAt.current ?? Date.now());
        if (elapsed > 2000 && (!look || look.slots.length === 0)) {
          setSearchingCopy("I’m widening the net slightly so you still get the silhouette.");
        }
        if (elapsed > 8000) {
          setPolling(false);
          if (!look) {
            setLook({
              look_id: jobId || "local",
              status: "partial",
              message:
                "I pulled the strongest pieces available right now and kept the line clean.",
              slots: [],
              total_price: null,
              currency: "EUR",
              missing_slots: ["anchor", "top", "bottom", "shoe", "accessory"],
          });
        }
      }
    }, 400);
    return () => clearInterval(timer);
  }, [polling, look, jobId]);

  React.useEffect(() => {
    if (!polling || !plan) return;
    let idx = 0;
    const lines = plan.stylist_script.loading_lines;
    if (!lines.length) return;
    const interval = setInterval(() => {
      idx = (idx + 1) % lines.length;
      setSearchingCopy(lines[idx]);
    }, 900);
    return () => clearInterval(interval);
  }, [polling, plan]);

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
            return (
              <div
                key={i}
                className={`rounded-2xl border p-3 text-sm ${m.role === "user" ? "bg-gray-50" : "bg-white"}`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                  {m.role === "user" ? "You" : "RunwayTwin Stylist"}
                </p>
                <p className="whitespace-pre-wrap text-gray-800">{m.content}</p>
              </div>
            );
          })}
        </div>

        {(look || polling) && (
          <div className="grid gap-3 rounded-2xl border bg-white p-3 text-sm">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
              RunwayTwin Stylist
            </p>
            <p className="whitespace-pre-wrap text-gray-900">
              {look?.message || searchingCopy}
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-[10px] text-gray-700">
              <span>Est. total (if priced):</span>
              <span className="font-semibold">
                {look?.total_price != null ? `${look.currency} ${look.total_price}` : "—"}
              </span>
            </div>

            {look?.missing_slots?.length ? (
              <p className="text-[11px] text-gray-600">
                I’m refining the remaining pieces in the background so the silhouette stays intact.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {(() => {
                const products = look?.slots?.length ? look.slots.map(toUiProduct) : [];
                const missingSlots = !polling ? look?.missing_slots ?? [] : [];
                const productCards = products.map((p) => ({ type: "product" as const, p }));
                const missingCards = (!polling && missingSlots.length)
                  ? missingSlots.map((slot) => ({
                      type: "missing" as const,
                      id: `missing-${slot}`,
                      slot,
                    }))
                  : [];
                const skeletonCards = polling
                  ? Array.from({ length: 4 }).map((_, idx) => ({
                      type: "skeleton" as const,
                      id: `skeleton-${idx}`,
                    }))
                  : [];
                const cards = productCards.length ? [...productCards, ...missingCards] : polling ? skeletonCards : missingCards;

                return cards.map((card) => {
                  if (card.type === "skeleton") {
                    return (
                      <div
                        key={card.id}
                        className="flex flex-col gap-2 rounded-2xl border p-3"
                      >
                        <div className="aspect-[4/5] w-full rounded-xl bg-gray-100 animate-pulse" />
                        <div className="h-3 rounded bg-gray-100 animate-pulse" />
                        <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
                      </div>
                    );
                  }

                  if (card.type === "missing") {
                    return (
                      <div
                        key={card.id}
                        className="flex flex-col gap-2 rounded-2xl border border-dashed p-3 text-[11px] text-gray-600"
                      >
                        <div className="aspect-[4/5] w-full rounded-xl bg-gray-50" />
                        <p className="font-semibold text-gray-800">No match found</p>
                        <p>{slotSuggestion(card.slot)}</p>
                      </div>
                    );
                  }

                  const p = card.p;
                  const img = proxyImage(p.image);
                  const url = p.affiliate_url ?? p.url;
                  const favPayload = {
                    id: p.id,
                    title: p.title,
                    url: url ?? undefined,
                    image: img ?? undefined,
                    brand: p.brand ?? undefined,
                    category: p.category,
                    price: p.price ?? undefined,
                    currency: p.currency ?? undefined,
                    retailer: p.retailer ?? undefined,
                  };

                  const saved = fav.has(favPayload);

                  return (
                    <article key={p.id} className="group flex flex-col rounded-2xl border p-3">
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={p.title}
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
                        {p.title}
                      </h3>
                      <p className="text-[10px] text-gray-500">
                        {p.brand ?? "—"} • {p.category}
                      </p>

                      <div className="mt-1 text-[10px] text-gray-800">
                        {p.price != null ? `${p.currency} ${p.price}` : "Price at retailer"}
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
                });
              })()}
            </div>
          </div>
        )}

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
