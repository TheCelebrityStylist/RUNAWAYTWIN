// FILE: components/StylistChat.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useStylistChat, Msg } from "./useStylistChat";

// Keep in sync with your API route's preferences shape
type Prefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budget?: number;
  country?: string;
  currency?: string;
  styleKeywords?: string;
  heightCm?: number;
  weightKg?: number;
};

type Props = { initialPreferences: Prefs };

export default function StylistChat({ initialPreferences }: Props) {
  const [prefs] = useState<Prefs>(initialPreferences || {});
  const [input, setInput] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);

  // ✅ pass preferences into the hook (so send() accepts a string)
  const { messages, draft, send, loading } = useStylistChat("/api/chat", undefined, prefs);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      send(input.trim()); // ✅ string only
      setInput("");
    },
    [input, send]
  );

  const quicks = useMemo(
    () => [
      "Zendaya for a gala in Paris",
      "Taylor Russell — gallery opening, rainy 16°C",
      "Timothée Chalamet — smart casual date",
      "Hailey Bieber — street style, under €300",
    ],
    []
  );

  return (
    <div className="card bg-[var(--rt-ivory)] border border-[var(--rt-border)]">
      <div className="p-4">
        <div className="text-sm text-[var(--rt-muted)] mb-3">
          Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes, and capsule tips.
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {quicks.map((q) => (
            <button
              key={q}
              type="button"
              className="px-3 py-1 rounded-full border border-[var(--rt-border)] hover:bg-[var(--rt-cream)] transition"
              onClick={() => send(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        <div
          ref={viewportRef}
          className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 mb-4"
          role="log"
          aria-live="polite"
        >
          {messages.map((m: Msg, i: number) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "self-end inline-block px-3 py-2 rounded-2xl bg-black text-white"
                  : "inline-block px-3 py-2 rounded-2xl bg-[var(--rt-cream)]"
              }
            >
              {m.content}
            </div>
          ))}
          {draft ? (
            <div className="inline-block px-3 py-2 rounded-2xl bg-[var(--rt-cream)] opacity-70">
              {draft}
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <input
            className="flex-1 h-11 rounded-xl border border-[var(--rt-border)] px-3 bg-white"
            placeholder='“Zendaya, Paris gallery opening, 18°C drizzle, smart-casual”'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            aria-label="Message the stylist"
          />
          <button type="submit" className="btn h-11 px-5 rounded-xl" disabled={loading || !input.trim()}>
            {loading ? "Styling…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
