// FILE: app/stylist/page.tsx
"use client";

import * as React from "react";

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

type UiProduct = {
  id: string;
  title: string;
  url: string | null;
  brand: string | null;
  category: string;
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
function currencySymbol(c?: string) {
  const u = (c || "").toUpperCase();
  if (u === "EUR") return "€";
  if (u === "USD") return "$";
  if (u === "GBP") return "£";
  return "";
}
function cls(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/* ================== Robust JSON coercion ================== */
function asString(x: unknown, def = ""): string {
  return typeof x === "string" ? x : def;
}
function asNumberOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function asProduct(x: unknown, fallbackCurrency: string): UiProduct | null {
  if (!isObj(x)) return null;
  return {
    id: asString(x["id"], crypto.randomUUID()),
    title: asString(x["title"], "Item"),
    url: typeof x["url"] === "string" ? x["url"] : null,
    brand: typeof x["brand"] === "string" ? x["brand"] : null,
    category: asString(x["category"], "Accessory"),
    price: asNumberOrNull(x["price"]),
    currency:
      typeof x["currency"] === "string" ? (x["currency"] as string) : fallbackCurrency,
    image: typeof x["image"] === "string" ? x["image"] : null,
  };
}

function coerceAiJsonUnknown(raw: unknown): AiJson | null {
  if (!isObj(raw)) return null;

  const productsRaw = Array.isArray(raw["products"]) ? (raw["products"] as unknown[]) : [];
  const currencyFromProducts =
    productsRaw
      .map((p) => (isObj(p) && typeof p["currency"] === "string" ? (p["currency"] as string) : null))
      .find((c): c is string => !!c) ?? "EUR";

  const products: UiProduct[] = productsRaw
    .map((p) => asProduct(p, currencyFromProducts))
    .filter((p): p is UiProduct => !!p);

  const totalObj = isObj(raw["total"]) ? (raw["total"] as Record<string, unknown>) : {};
  const totalCurrency =
    typeof totalObj["currency"] === "string"
      ? (totalObj["currency"] as string)
      : currencyFromProducts;
  const totalValue = asNumberOrNull(totalObj["value"]);

  const brief = asString(raw["brief"], "");
  const tips = Array.isArray(raw["tips"]) ? (raw["tips"] as unknown[]).filter((s) => typeof s === "string") as string[] : [];
  const why = Array.isArray(raw["why"]) ? (raw["why"] as unknown[]).filter((s) => typeof s === "string") as string[] : [];

  if (!brief && products.length === 0 && tips.length === 0 && why.length === 0) return null;

  return {
    brief,
    tips,
    why,
    products,
    total: { value: totalValue, currency: totalCurrency },
  };
}

/* ========================= Skeletons & Hooks ========================= */
function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="aspect-[4/5] w-full animate-pulse rounded-xl bg-gray-100" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-9 w-full animate-pulse rounded bg-gray-100" />
    </div>
  );
}
function useDots(active: boolean) {
  const [dots, setDots] = React.useState(".");
  React.useEffect(() => {
    if (!active) {
      setDots(".");
      return;
    }
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 450);
    return () => clearInterval(id);
  }, [active]);
  return dots;
}

/* ========================= Intent detection ========================= */
function looksLikeStyleBrief(s: string) {
  const q = s.toLowerCase();
  const keywords =
    /(look|outfit|wear|style|dress|suit|gala|wedding|date|interview|party|gallery|opening|smart|casual|rain|snow|summer|winter|capsule|inspired|like|red carpet)/i;
  const temp = /\b\d+\s?°\s?[cf]\b/i;
  return keywords.test(q) || temp.test(q);
}

/* ========================= Page ========================= */
const DEMOS = [
  `Zendaya for a gala in Paris`,
  `Taylor Russell — gallery opening, rainy 16°C`,
  `Timothée Chalamet — smart casual date`,
  `Hailey Bieber — street style, under €300`,
];

export default function StylistPage() {
  /* Prefs */
  const [prefs, setPrefs] = React.useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem("rwt-prefs");
      if (raw) return JSON.parse(raw) as Prefs;
    } catch {}
    return {};
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

  /* Chat + Plan */
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [plan, setPlan] = React.useState<AiJson | null>(null);
  const dots = useDots(sending);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const nextMsgs: Msg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMsgs);
      setInput("");
      setSending(true);

      const endpoint = looksLikeStyleBrief(trimmed) ? "/api/chat" : "/api/say";
      if (endpoint === "/api/say") {
        // Small talk path: don’t touch the current plan
        try {
          const res = await fetch("/api/say", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: nextMsgs }),
          });
          const txt = await res.text();
          setMessages((m) => [...m, { role: "assistant", content: txt }]);
        } catch {
          setMessages((m) => [
            ...m,
            { role: "assistant", content: "Hi! What are we styling next?" },
          ]);
        } finally {
          setSending(false);
        }
        return;
      }

      // Styling path: clear old plan and expect JSON
      setPlan(null);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMsgs, preferences: prefs }),
        });

        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          const txt = await res.text();
          setMessages((m) => [...m, { role: "assistant", content: txt || "I hit a hiccup." }]);
          return;
        }

        if (ct.includes("application/json")) {
          const data = (await res.json().catch(() => null)) as unknown;
          const coerced = coerceAiJsonUnknown(data);
          if (coerced) {
            setPlan(coerced);
            setMessages((m) => [
              ...m,
              { role: "assistant", content: coerced.brief || "Here’s your look." },
            ]);
          } else {
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                content:
                  "I couldn’t parse the look. Could you add the occasion, vibe, and budget?",
              },
            ]);
          }
        } else {
          // Fallback text; try best-effort parse if it looks like JSON
          const txt = await res.text();
          try {
            const maybe = JSON.parse(txt);
            const coerced = coerceAiJsonUnknown(maybe);
            if (coerced) {
              setPlan(coerced);
              setMessages((m) => [
                ...m,
                { role: "assistant", content: coerced.brief || "Here’s your look." },
              ]);
            } else {
              setMessages((m) => [...m, { role: "assistant", content: txt }]);
            }
          } catch {
            setMessages((m) => [...m, { role: "assistant", content: txt }]);
          }
        }
      } catch {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Network hiccup while styling. Please try again, or add a bit more detail (occasion, weather, budget).",
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

  const sizes = prefs.sizes ?? {};
  const totalLabel =
    plan?.total?.value != null
      ? `${currencySymbol(plan.total.currency)}${plan.total.value}`
      : "—";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Preferences BAR on top (sticky, not stretched) */}
      <section className="sticky top-14 z-10 mb-6 grid gap-3 rounded-2xl border bg-white/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <p className="text-sm font-semibold">Preferences</p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="col-span-2 md:col-span-1">
            <Select
              aria-label="Gender"
              value={prefs.gender ?? ""}
              onChange={(e) => updatePrefs({ gender: e.target.value as Gender })}
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
              placeholder="budget band or number"
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

        {/* Sizes row */}
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
            onChange={(e) =>
              updatePrefs({ sizes: { ...sizes, shoe: e.target.value || undefined } })
            }
          />
        </div>
      </section>

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

      {/* Chat + input */}
      <section className="mb-4 grid gap-2 rounded-2xl border bg-white p-4">
        <p className="text-sm text-gray-700">
          Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes, and capsule tips.
        </p>

        <div className="grid gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cls("rounded-xl border p-3 text-sm", m.role === "user" ? "bg-gray-50" : "bg-white")}
            >
              <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">{m.role}</p>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {sending ? (
            <div className="rounded-xl border bg-white p-3 text-sm">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">assistant</p>
              <div>Styling{dots}</div>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`"Zendaya, Paris gallery opening, 18°C drizzle, smart-casual"`}
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-gray-600"
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

      {/* Plan / Products */}
      <section className="grid gap-3 rounded-2xl border bg-white p-4">
        <div className="text-sm text-gray-800">
          {plan?.brief ? plan.brief : "Ask for a look above — I’ll return a clean, shoppable plan here."}
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border px-2 py-1 text-xs font-medium text-gray-700">
            Total: {totalLabel}
          </span>
        </div>

        {sending ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : plan?.products?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {plan.products.map((p) => (
              <article key={p.id} className="flex flex-col rounded-2xl border p-3">
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.title}</h3>
                <p className="text-xs text-gray-500">
                  {p.brand ?? "—"} • {p.category}
                </p>
                <div className="mt-2 text-xs text-gray-700">
                  {p.price != null ? `${currencySymbol(p.currency)}${p.price}` : "?"}
                </div>
                {p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center rounded-lg border px-3 py-1 text-xs font-medium hover:bg-gray-50"
                  >
                    View
                  </a>
                ) : (
                  <span className="mt-2 inline-flex items-center justify-center rounded-lg border px-3 py-1 text-xs text-gray-500">
                    No link
                  </span>
                )}
              </article>
            ))}
          </div>
        ) : null}

        {plan?.why?.length ? (
          <div className="mt-2">
            <p className="mb-1 text-sm font-semibold">Why it flatters</p>
            <ul className="list-disc pl-5 text-sm text-gray-800">
              {plan.why.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {plan?.tips?.length ? (
          <div className="mt-2">
            <p className="mb-1 text-sm font-semibold">Capsule & styling tips</p>
            <ul className="list-disc pl-5 text-sm text-gray-800">
              {plan.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}

