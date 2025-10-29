// FILE: app/stylist/page.tsx
"use client";

import * as React from "react";
import type { Prefs, Gender, Msg } from "@/lib/types";

/**
 * Preferences sit ON TOP (mobile-first). On wide screens we keep them on top
 * as a single column for clarity; we can later switch to a side-by-side if desired.
 */

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
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-600 focus-visible:ring-2 focus-visible:ring-black/20 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-gray-300 px-2 py-2 text-sm outline-none focus:border-gray-600 focus-visible:ring-2 focus-visible:ring-black/20 ${props.className ?? ""}`}
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-gray-700">{children}</label>;
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
    <section
      aria-labelledby="prefs-title"
      className="grid gap-3 rounded-2xl border bg-white p-4"
    >
      <p id="prefs-title" className="text-sm font-semibold">
        Preferences
      </p>

      {/* Gender */}
      <div className="grid gap-1 max-w-lg">
        <Label>Gender</Label>
        <Select
          value={prefs.gender ?? ""}
          onChange={(e) => update({ gender: (e.target.value || undefined) as Gender })}
          aria-label="Gender"
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
            aria-label="Body type"
          />
        </div>
        <div className="grid gap-1">
          <Label>Budget band</Label>
          <TextInput
            placeholder="high-street / mid / luxury or a number"
            value={prefs.budget ?? ""}
            onChange={(e) => update({ budget: e.target.value || undefined })}
            aria-label="Budget band"
          />
        </div>
        <div className="grid gap-1">
          <Label>Country (ISO-2 or name)</Label>
          <TextInput
            placeholder="NL / US / UK / France…"
            value={prefs.country ?? ""}
            onChange={(e) => update({ country: e.target.value || undefined })}
            aria-label="Country"
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
            aria-label="Top size"
          />
          <TextInput
            placeholder="Bottom"
            value={sizes.bottom ?? ""}
            onChange={(e) =>
              update({ sizes: { ...sizes, bottom: e.target.value || undefined } })
            }
            aria-label="Bottom size"
          />
          <TextInput
            placeholder="Dress"
            value={sizes.dress ?? ""}
            onChange={(e) =>
              update({ sizes: { ...sizes, dress: e.target.value || undefined } })
            }
            aria-label="Dress size"
          />
          <TextInput
            placeholder="Shoe"
            value={sizes.shoe ?? ""}
            onChange={(e) =>
              update({ sizes: { ...sizes, shoe: e.target.value || undefined } })
            }
            aria-label="Shoe size"
          />
        </div>
      </div>

      {/* Keywords */}
      <div className="grid gap-1 max-w-2xl">
        <Label>Style keywords (comma-separated)</Label>
        <TextInput
          placeholder="minimal, monochrome, soft tailoring"
          value={(prefs.keywords ?? []).join(", ")}
          onChange={(e) =>
            update({
              keywords: e.currentTarget.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          aria-label="Style keywords"
        />
      </div>
    </section>
  );
}

export default function StylistPage() {
  // load/save preferences
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

  // chat
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

      {/* Preferences ON TOP */}
      <PreferencesPanel prefs={prefs} update={updatePrefs} />

      {/* Chat + Results below */}
      <section className="mt-6 grid content-start gap-4 rounded-2xl border bg-white p-4">
        <p className="text-sm text-gray-700">
          Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes,
          and capsule tips.
        </p>

        <div className="grid gap-3">
          {messages.map((m, i) => (
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
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`"Zendaya, Paris gallery opening, 18°C drizzle, smart-casual"`}
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-sm outline-none focus:border-gray-600 focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Styling request"
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
    </main>
  );
}

