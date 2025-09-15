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
      {/* CHAT */}
      <div className="flex min-h-[70vh] max-h-[78vh] flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-black/30 backdrop-blur">
        <header className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold tracking-tight">Talk to Your AI Stylist</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Muse + occasion → I’ll assemble a shoppable head-to-toe look with links, fit notes, and capsule tips.
          </p>
        </header>

        <div
          ref={viewportRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[80%] whitespace-pre-wrap leading-relaxed rounded-xl px-4 py-3 " +
                  (m.role === "user"
                    ? "bg-black text-white"
                    : m.role === "tool"
                    ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
                    : "bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800")
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {!!draft && (
            <div className="text-left">
              <div className="inline-block max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                {draft}
                <span className="ml-1 animate-pulse">▍</span>
              </div>
            </div>
          )}
        </div>

        <form
          className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            send({ text: input.trim(), preferences });
            setInput("");
          }}
        >
          <input
            className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900 px-4 py-3 outline-none focus:ring-2 focus:ring-black/20"
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
            className="rounded-xl bg-black text-white px-4 py-3 disabled:opacity-50"
          >
            {loading ? "Styling…" : "Send"}
          </button>
        </form>
      </div>

      {/* RIGHT: Sticky rail (no whitespace abyss) */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 space-y-4">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-black/30 backdrop-blur p-4">
            <h3 className="font-semibold">Your Preferences</h3>
            <pre className="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap mt-2">
              {JSON.stringify(preferences, null, 2)}
            </pre>
            <p className="text-[11px] mt-2 text-neutral-500">
              These drive fit, budget, and local stock in real time.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-black/30 backdrop-blur p-4">
            <h3 className="font-semibold">Pro Tip</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Mention dress code & weather for sharper picks (e.g., “cocktail, 26°C, rooftop drinks”).
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
