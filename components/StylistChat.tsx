// components/StylistChat.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStylistChat } from "./useStylistChat";

type Props = { preferences: any };

export default function StylistChat({ preferences }: Props) {
  const { messages, draft, send, loading } = useStylistChat("/api/chat");
  const [input, setInput] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
      {/* CHAT PANEL */}
      <div className="card flex min-h-[68vh] max-h-[78vh] flex-col overflow-hidden">
        <header className="px-5 py-4 border-b" style={{ borderColor: "var(--rt-border)" }}>
          <h2 className="text-[15px] font-semibold tracking-tight">Talk to Your AI Stylist</h2>
          <p className="mt-1 text-[13px]" style={{ color: "var(--rt-charcoal)" }}>
            Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes, and capsule tips.
          </p>
        </header>

        <div
          ref={viewportRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {messages.map((m) => (
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
                style={
                  m.role === "assistant"
                    ? { borderColor: "var(--rt-border)", background: "white" }
                    : undefined
                }
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

        <form
          className="px-3 py-3 border-t flex gap-2 items-center"
          style={{ borderColor: "var(--rt-border)" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            send({ text: input.trim(), preferences });
            setInput("");
          }}
        >
          <input
            className="flex-1 h-10 rounded-full border px-4 text-[14px] outline-none"
            style={{
              borderColor: "var(--rt-border)",
              background: "rgba(255,255,255,.9)",
            }}
            placeholder="“Zendaya, Paris gallery opening, 18°C drizzle, smart-casual”"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && input.trim()) {
                send({ text: input.trim(), preferences });
                setInput("");
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn"
            style={{ opacity: loading || !input.trim() ? 0.6 : 1 }}
          >
            {loading ? "Styling…" : "Send"}
          </button>
        </form>
      </div>

      {/* RIGHT RAIL (Sticky, matches your site cards) */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-[15px]">Your Preferences</h3>
            <pre className="mt-2 text-[12px] leading-5 text-[var(--rt-charcoal)] whitespace-pre-wrap">
              {JSON.stringify(preferences, null, 2)}
            </pre>
            <p className="text-[11px] mt-2" style={{ color: "var(--rt-muted)" }}>
              Drives fit, budget, and local stock in real time.
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-[15px]">Pro Tip</h3>
            <p className="text-[13px] mt-1" style={{ color: "var(--rt-charcoal)" }}>
              Add dress code + weather for sharper picks (e.g., “cocktail, 26°C, rooftop drinks”).
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
