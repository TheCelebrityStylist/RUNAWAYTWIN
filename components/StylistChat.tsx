// components/StylistChat.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStylistChat, Msg } from "./useStylistChat";
import PreferencesPanel, { Prefs } from "./preferences/PreferencesPanel";
import LookBuilder from "./look/LookBuilder";

const PREFS_KEY = "rt_prefs_v2";

type Props = { initialPreferences: Prefs };

const QUICK = [
  "Zendaya for a gala in Paris",
  "Taylor Russell — gallery opening, rainy 16°C",
  "Timothée Chalamet — smart casual date",
  "Hailey Bieber — street style, under €300",
];

export default function StylistChat({ initialPreferences }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPreferences);
  const { messages, draft, send, loading } = useStylistChat("/api/chat");
  const [input, setInput] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore write errors
    }
  }, [prefs]);

  const onScroll = () => {
    if (!viewportRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    userScrolledUp.current = scrollHeight - (scrollTop + clientHeight) > 80;
  };

  const scrollToBottom = useCallback(() => {
    if (!viewportRef.current || userScrolledUp.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, draft, scrollToBottom]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send({ text: input.trim(), preferences: prefs });
    setInput("");
  };

  const combinedText = useMemo(() => {
    const history = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .join("\n\n");
    return history + (draft ? "\n\n" + draft : "");
  }, [messages, draft]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
      <div className="space-y-6">
        <div className="card flex min-h-[60vh] max-h-[72vh] flex-col overflow-hidden">
          <header className="px-5 pt-4 pb-2 border-b" style={{ borderColor: "var(--rt-border)" }}>
            <h2 className="text-[15px] font-semibold tracking-tight">Talk to Your AI Stylist</h2>
            <p className="mt-1 text-[13px]" style={{ color: "var(--rt-charcoal)" }}>
              Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes, and capsule tips.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="px-3 h-8 rounded-full border text-[12px]"
                  style={{ borderColor: "var(--rt-border)", background: "white" }}
                  onClick={() => send({ text: q, preferences: prefs })}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          </header>

          <div ref={viewportRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((m: Msg) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    "inline-block max-w-[80%] whitespace-pre-wrap leading-relaxed rounded-2xl px-4 py-3 " +
                    (m.role === "user"
                      ? "bg-black text-white"
                      : m.role === "tool"
                      ? "bg-[var(--rt-ivory)] text-[var(--rt-charcoal)]"
                      : "border")
                  }
                  style={m.role === "assistant" ? { borderColor: "var(--rt-border)", background: "white" } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {!!draft && (
              <div className="text-left">
                <div
                  className="inline-block max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 border"
                  style={{ borderColor: "var(--rt-border)", background: "white" }}
                >
                  {draft}
                  <span className="ml-1 animate-pulse">▍</span>
                </div>
              </div>
            )}
          </div>

          <form className="px-3 py-3 border-t flex gap-2 items-center" style={{ borderColor: "var(--rt-border)" }} onSubmit={onSubmit}>
            <input
              className="flex-1 h-10 rounded-full border px-4 text-[14px] outline-none"
              style={{ borderColor: "var(--rt-border)", background: "rgba(255,255,255,.9)" }}
              placeholder="“Zendaya, Paris gallery opening, 18°C drizzle, smart-casual”"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && input.trim()) {
                  send({ text: input.trim(), preferences: prefs });
                  setInput("");
                }
              }}
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn" style={{ opacity: loading || !input.trim() ? 0.6 : 1 }}>
              {loading ? "Styling…" : "Send"}
            </button>
          </form>
        </div>

        <LookBuilder text={combinedText} />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-4">
          <PreferencesPanel value={prefs} onChange={setPrefs} />
        </div>
      </aside>
    </div>
  );
}
