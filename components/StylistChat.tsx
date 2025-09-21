"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStylistChat, Msg } from "./useStylistChat";
import PreferencesPanel from "./preferences/PreferencesPanel";
import LookBuilder from "./look/LookBuilder";
import type { Preferences } from "@/lib/preferences/types";
import { useAccount } from "./account/AccountProvider";

const PREFS_KEY = "rt_prefs_v3";

const QUICK_PROMPTS = [
  "Zendaya for a Paris premiere afterparty — midnight metallics",
  "Taylor Russell curating an art gallery opening in London, rainy 16°C",
  "Timothée Chalamet for a smart-casual date night in NYC",
  "Hailey Bieber off-duty at Soho House — under €400",
];

type Props = { initialPreferences: Preferences };

type BubbleProps = {
  message: Msg;
};

function Bubble({ message }: BubbleProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const base = "whitespace-pre-wrap rounded-2xl px-4 py-3 text-[14px] leading-relaxed";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className={`${base} bg-black text-white shadow-sm max-w-[80%]`}>{message.content}</div>
      </div>
    );
  }
  if (isTool) {
    return (
      <div className="flex justify-start">
        <div
          className={`${base} border max-w-[70%] text-[13px]`}
          style={{ borderColor: "var(--rt-border)", background: "var(--rt-ivory)", color: "var(--rt-charcoal)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className={`${base} border bg-white/95 shadow-sm backdrop-blur max-w-[80%]`}
        style={{ borderColor: "var(--rt-border)", color: "var(--rt-charcoal)" }}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function StylistChat({ initialPreferences }: Props) {
  const { user } = useAccount();
  const { messages, draft, send, loading, hydrate } = useStylistChat("/api/chat");
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences);
  const [input, setInput] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const pendingSave = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // hydrate preferences from local storage + account
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.warn("prefs load failed", err);
    }
  }, []);

  useEffect(() => {
    if (user?.preferences) {
      setPrefs((prev) => ({ ...prev, ...user.preferences }));
    }
  }, [user?.preferences]);

  // persist preferences locally + to account
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (err) {
      console.warn("prefs write failed", err);
    }

    if (pendingSave.current) clearTimeout(pendingSave.current);
    if (!user) return;

    pendingSave.current = setTimeout(() => {
      fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      }).catch((err) => console.error("prefs sync failed", err));
    }, 600);

    return () => {
      if (pendingSave.current) clearTimeout(pendingSave.current);
    };
  }, [prefs, user]);

  // hydrate history when session changes
  useEffect(() => {
    let active = true;
    if (!user) {
      hydrate([]);
      return () => {
        active = false;
      };
    }
    (async () => {
      try {
        const res = await fetch("/api/chat/history", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        const records = Array.isArray(data?.messages) ? (data.messages as Msg[]) : [];
        hydrate(records);
      } catch (err) {
        console.error("history load failed", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, hydrate]);

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
    void send({ text: input.trim(), preferences: prefs });
    setInput("");
  };

  const combinedText = useMemo(() => {
    const transcript = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .join("\n\n");
    return transcript + (draft ? "\n\n" + draft : "");
  }, [messages, draft]);

  const planSummary = useMemo(() => {
    if (!user) return "Guest mode · 1 free look";
    if (user.subscriptionActive) return "Unlimited member";
    if (!user.freeLookUsed) return "Welcome look available";
    if (user.lookCredits > 0) return `${user.lookCredits} look${user.lookCredits === 1 ? "" : "s"} remaining`;
    return "Add credits for the next look";
  }, [user]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="card overflow-hidden border border-transparent bg-gradient-to-br from-white/90 via-white to-[#f7f5f2]">
          <header className="border-b px-6 py-5" style={{ borderColor: "var(--rt-border)" }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--rt-muted)" }}>
                  RunwayTwin Stylist
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">Your look curator is listening</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--rt-charcoal)" }}>
                  Drop a muse, an occasion, a vibe, even the weather — I’ll stream a head-to-toe outfit with real links,
                  alternates, and capsule ideas.
                </p>
              </div>
              <div className="rounded-2xl border px-4 py-2 text-sm" style={{ borderColor: "var(--rt-border)", background: "white" }}>
                {planSummary}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs transition hover:bg-black hover:text-white"
                  style={{ borderColor: "var(--rt-border)", background: "white" }}
                  onClick={() => void send({ text: prompt, preferences: prefs })}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </header>

          <div ref={viewportRef} onScroll={onScroll} className="h-[420px] overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
            {!!draft && (
              <div className="flex justify-start">
                <div
                  className="whitespace-pre-wrap rounded-2xl border bg-white/95 px-4 py-3 text-[14px] leading-relaxed shadow-sm"
                  style={{ borderColor: "var(--rt-border)", color: "var(--rt-charcoal)" }}
                >
                  {draft}
                  <span className="ml-1 animate-pulse">▍</span>
                </div>
              </div>
            )}
          </div>

          <form className="border-t px-5 py-4" style={{ borderColor: "var(--rt-border)" }} onSubmit={onSubmit}>
            <div className="flex items-center gap-3">
              <input
                className="flex-1 h-11 rounded-full border px-4 text-[14px] outline-none"
                style={{ borderColor: "var(--rt-border)", background: "rgba(255,255,255,.95)" }}
                placeholder="e.g. ‘Sofia Richie wedding welcome dinner in Capri, 24°C breeze’"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && input.trim()) {
                    void send({ text: input.trim(), preferences: prefs });
                    setInput("");
                  }
                }}
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn" style={{ opacity: loading || !input.trim() ? 0.6 : 1 }}>
                {loading ? "Styling…" : "Send"}
              </button>
            </div>
          </form>
        </section>

        <LookBuilder text={combinedText} />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-4 space-y-4">
          <PreferencesPanel value={prefs} onChange={setPrefs} />
          <div className="rounded-3xl border px-4 py-4 text-sm" style={{ borderColor: "var(--rt-border)", background: "white" }}>
            <p className="font-semibold">Tips for the sharpest looks</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]" style={{ color: "var(--rt-charcoal)" }}>
              <li>Include the vibe, setting, and any muses — I’ll echo it in fabric and silhouette.</li>
              <li>Pin your preferences once; every turn already knows your sizes and budget.</li>
              <li>Ready to remix? Ask me to rework any item or color story mid-conversation.</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
