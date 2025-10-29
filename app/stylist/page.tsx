// FILE: app/stylist/page.tsx
"use client";

import * as React from "react";
import type { Prefs, Gender, Msg } from "@/lib/types";

/* ============================================================
   Minimal state (localStorage-backed) + UI helpers
   ============================================================ */

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

/* ============================================================
   Preferences Panel
   ============================================================ */

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
          onChange={(e) =>
            update({
              gender: (e.target.value || undefined) as Gender | undefined,
            })
          }
        >
          <option value="">—</option>
          <option value="female">female</option>
          <option value="male">male</option>
          <option value="other">other</option>
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
            onChange={(e) => update({ sizes: { ...sizes, top: e.target.value || undefined } })}
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
            onChange={(e) => update({ sizes: { ...sizes, dress: e.target.value || undefined } })}
          />
          <TextInput
            placeholder="Shoe"
            value={sizes.shoe ?? ""}
            onChange={(e) => update({ sizes: { ...sizes, shoe: e.target.value || undefined } })}
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

/* ============================================================
   Lightweight streaming chat hook (reads text deltas)
   ============================================================ */

function useStreamingChat() {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [draft, setDraft] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const send = React.useCallback(async (input: string, prefs: Prefs) => {
    const userMsg: Msg = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setDraft("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, preferences: prefs }),
      });

      // No stream? Just take text once.
      if (!res.body) {
        const txt = await res.text();
        setMessages((prev) => [...prev, { role: "assistant", content: txt }]);
        setDraft("");
        setLoading(false);
        return;
      }

      // Stream chunks (server returns text/plain stream of tokens)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setDraft(acc); // live typing
      }

      setMessages((prev) => [...prev, { role: "assistant", content: acc }]);
      setDraft("");
    } catch (e) {
      const msg = String((e as Error)?.message || e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I ran into an error: " + msg },
      ]);
      setDraft("");
    } finally {
      setLoading(false);
    }
  }, [messages]);

  return { messages, draft, loading, send, setMessages };
}

/* ============================================================
   Lookbook parser (grabs lines with a URL from assistant text)
   ============================================================ */

type LookItem = { label: string; title: string; url: string };

function parseLookbookFrom(text: string): LookItem[] {
  const items: LookItem[] = [];
  const lines = text.split(/\n+/);
  for (const line of lines) {
    // Expect patterns like:
    // "- Top: Brand — Full Title | ? EUR | retailer.com | https://..."
    // "- Shoes: (closest match not linked)"  → skip (no URL)
    const m = line.match(/^\s*[-•]\s*([^:]+):\s*(.+?)\s*\|\s*.*?\|\s*.*?\|\s*(https?:\/\/\S+)/i);
    if (m) {
      const label = m[1].trim();
      const title = m[2].trim();
      const url = m[3].trim().replace(/\)*\.?$/, "");
      items.push({ label, title, url });
      continue;
    }
    // Also accept "• [LINK 1] Title — https://..." from candidates
    const m2 = line.match(/^•\s*\[LINK\s*\d+\]\s*(.+?)\s*—\s*(https?:\/\/\S+)/i);
    if (m2) {
      items.push({ label: "Link", title: m2[1].trim(), url: m2[2].trim() });
    }
  }
  return items.slice(0, 12);
}

/* ============================================================
   Page
   ============================================================ */

export default function StylistPage() {
  // prefs (persist to LS)
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

  // chat
  const { messages, draft, loading, send } = useStreamingChat();
  const [input, setInput] = React.useState("");
  const streamEndRef = React.useRef<HTMLDivElement | null>(null);

  // autoscroll on new draft/messages
  React.useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, draft]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    void send(text, prefs);
  };

  // derive a lookbook from the latest assistant message (or draft)
  const latestAssistant =
    [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
  const renderSource = draft || latestAssistant;
  const lookItems = React.useMemo(() => parseLookbookFrom(renderSource), [renderSource]);

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.45fr_1fr]">
        {/* Chat + Composer */}
        <section className="grid content-start gap-4 rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes,
              and capsule tips.
            </p>
          </div>

          <div className="grid gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-gray-50" : "bg-white"
                }`}
              >
                <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">{m.role}</p>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}

            {draft && (
              <div className="rounded-xl border bg-white p-3 text-sm leading-relaxed">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">
                  assistant (typing)
                </p>
                <div className="whitespace-pre-wrap">{draft}</div>
              </div>
            )}
            <div ref={streamEndRef} />
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
              disabled={loading}
              className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
            >
              {loading ? "Styling…" : "Send"}
            </button>
          </form>
        </section>

        {/* Preferences */}
        <PreferencesPanel prefs={prefs} update={updatePrefs} />
      </div>

      {/* Lookbook (parsed links from reply) */}
      {lookItems.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Lookbook</h2>
            <p className="text-xs text-gray-500">Auto-parsed from the assistant’s links</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {lookItems.map((it, idx) => (
              <a
                key={idx}
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border p-3 transition hover:shadow-sm"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {it.label}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 group-hover:underline">
                  {it.title}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">{it.url}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
