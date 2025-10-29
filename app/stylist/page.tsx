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
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium uppercase tracking-wide text-gray-600">
      {children}
    </label>
  );
}

/* =================== Preferences Panel =================== */
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

      <div className="grid gap-1">
        <Label>Gender</Label>
        <Select
          value={prefs.gender ?? ""}
          onChange={(e) => update({ gender: e.target.value as Gender })}
        >
          <option value="">—</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </Select>
      </div>

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
            value={prefs.budget ?? ""}
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
              update({
                sizes: { ...sizes, bottom: e.target.value || undefined },
              })
            }
          />
          <TextInput
            placeholder="Dress"
            value={sizes.dress ?? ""}
            onChange={(e) =>
              update({
                sizes: { ...sizes, dress: e.target.value || undefined },
              })
            }
          />
          <TextInput
            placeholder="Shoe"
            value={sizes.shoe ?? ""}
            onChange={(e) =>
              update({
                sizes: { ...sizes, shoe: e.target.value || undefined },
              })
            }
          />
        </div>
      </div>

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

/** Coerces unknown JSON into AiJson; returns null if nothing usable */
function coerceAiJson(content: string): AiJson | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;

  const productsRaw = Array.isArray(raw["products"]) ? (raw["products"] as unknown[]) : [];

  // Find a currency safely from products, fall back to "EUR"
  const currencyFromProducts =
    productsRaw
      .map((p) => (isObj(p) && typeof p["currency"] === "string" ? (p["currency"] as string) : null))
      .find((c): c is string => !!c) ?? "EUR";

  const products: UiProduct[] = productsRaw
    .map((p) => asProduct(p, currencyFromProducts))
    .filter((p): p is UiProduct => !!p);

  // total currency: prefer raw.total.currency if valid else product currency else "EUR"
  const totalObj = isObj(raw["total"]) ? (raw["total"] as Record<string, unknown>) : {};
  const totalCurrency =
    typeof totalObj["currency"] === "string"
      ? (totalObj["currency"] as string)
      : currencyFromProducts;

  const totalValue = asNumberOrNull(totalObj["value"]);

  const brief = asString(raw["brief"], "");
  const tips = Array.isArray(raw["tips"]) ? (raw["tips"] as unknown[]).filter((s) => typeof s === "string") as string[] : [];
  const why = Array.isArray(raw["why"]) ? (raw["why"] as unknown[]).filter((s) => typeof s === "string") as string[] : [];

  if (!brief && products.length === 0 && tips.length === 0 && why.length === 0) {
    return null;
  }

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
  `Zendaya for a gala in Paris`,
  `Taylor Russell — gallery opening, rainy 16°C`,
  `Timothée Chalamet — smart casual date`,
  `Hailey Bieber — street style, under €300`,
];

export default function StylistPage() {
  const [prefs, setPrefs] = React.useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem("rwt-prefs");
      if (raw) return JSON.parse(raw) as Prefs;
    } catch {}
    return {};
  });

  const updatePrefs = React.useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = {
        ...p,
        ...patch,
        sizes: { ...(p.sizes ?? {}), ...(patch.sizes ?? {}) },
      };
      try {
        localStorage.setItem("rwt-prefs", JSON.stringify(next));
      } catch {}
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

        const contentType = res.headers.get("content-type") || "";
        let reply: string;

        if (contentType.includes("application/json")) {
          const data = await res.json();
          reply = JSON.stringify(data);
        } else {
          reply = await res.text();
        }

        setMessages((m) => [...m, { role: "assistant", content: reply }]);
      } catch {
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
      {/* Top chips */}
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

      {/* Layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.6fr_1fr]">
        {/* Chat */}
        <section className="grid content-start gap-4 rounded-2xl border bg-white p-4">
          <p className="text-sm text-gray-700">
            Muse + occasion → I’ll assemble a shoppable head-to-toe look with
            links, fit notes, and capsule tips.
          </p>

          <div className="grid gap-3">
            {messages.map((m, i) => {
              const ai = m.role === "assistant" ? coerceAiJson(m.content) : null;

              return (
                <div
                  key={i}
                  className={`rounded-xl border p-3 text-sm ${
                    m.role === "user" ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <p className="mb-2 text-[11px] uppercase tracking-wide text-gray-500">
                    {m.role}
                  </p>

                  {ai ? (
                    <div className="grid gap-3">
                      {/* brief */}
                      <p className="text-gray-800">{ai.brief}</p>

                      {/* total */}
                      <div className="inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700">
                        <span>Total:</span>
                        <span className="font-semibold">
                          {ai.total.value != null
                            ? `${ai.total.currency} ${ai.total.value}`
                            : "—"}
                        </span>
                      </div>

                      {/* products grid */}
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {ai.products.map((p) => (
                          <article
                            key={p.id}
                            className="flex flex-col rounded-2xl border p-3"
                          >
                            <div className="aspect-[4/5] w-full rounded-xl bg-gray-100" />
                            <h3 className="mt-2 line-clamp-2 text-sm font-medium">
                              {p.title}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {p.brand ?? "—"} • {p.category}
                            </p>
                            <div className="mt-2 text-xs text-gray-700">
                              {p.price != null ? `${p.currency} ${p.price}` : "?"}
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

                      {/* tips + why */}
                      {(ai.why?.length || ai.tips?.length) && (
                        <div className="grid gap-2">
                          {ai.why?.length ? (
                            <div>
                              <p className="mb-1 text-[13px] font-semibold">
                                Why it flatters
                              </p>
                              <ul className="list-disc pl-5 text-sm text-gray-700">
                                {ai.why.map((w, idx) => (
                                  <li key={idx}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {ai.tips?.length ? (
                            <div>
                              <p className="mb-1 text-[13px] font-semibold">
                                Capsule & tips
                              </p>
                              <ul className="list-disc pl-5 text-sm text-gray-700">
                                {ai.tips.map((t, idx) => (
                                  <li key={idx}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-gray-800">
                      {m.content}
                    </pre>
                  )}
                </div>
              );
            })}
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

        {/* Preferences */}
        <PreferencesPanel prefs={prefs} update={updatePrefs} />
      </div>
    </main>
  );
}


