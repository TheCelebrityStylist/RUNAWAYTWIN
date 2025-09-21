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
  const base =
    "whitespace-pre-wrap rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-[0_14px_38px_rgba(15,23,42,0.06)]";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={`${base} max-w-[80%] text-[var(--rt-ivory)]`}
          style={{ background: "var(--rt-charcoal)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  if (isTool) {
    return (
      <div className="flex justify-start">
        <div
          className={`${base} max-w-[70%] text-[13px]`}
          style={{
            border: "1px solid var(--rt-border)",
            background: "rgba(255,255,255,0.92)",
            color: "var(--rt-muted)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className={`${base} max-w-[80%]`}
        style={{
          border: "1px solid var(--rt-border)",
          background: "linear-gradient(120deg, rgba(255,255,255,0.96), rgba(247,245,242,0.95))",
          color: "var(--rt-charcoal)",
        }}
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
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
        <section
          className="card overflow-hidden border bg-white/95 backdrop-blur"
          style={{ borderColor: "var(--rt-border)" }}
        >
          <header className="border-b px-6 py-6" style={{ borderColor: "var(--rt-border)" }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--rt-muted)" }}>
                  RunwayTwin stylist concierge
                </p>
                <h2 className="text-[26px] font-semibold tracking-tight">Let’s build your next legendary look</h2>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--rt-charcoal)" }}>
                  Feed me a muse, occasion, climate, or colors — I’ll respond like your celebrity stylist with shoppable
                  links, alternates, and capsule riffs.
                </p>
              </div>
              <div
                className="rounded-full border px-5 py-2 text-[13px] font-medium"
                style={{ borderColor: "var(--rt-border)", background: "rgba(255,255,255,0.88)" }}
              >
                {planSummary}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-black hover:text-white"
                  style={{ borderColor: "var(--rt-border)", background: "white" }}
                  onClick={() => void send({ text: prompt, preferences: prefs })}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </header>

          <div
            ref={viewportRef}
            onScroll={onScroll}
            className="space-y-4 px-6 py-6"
            style={{ maxHeight: "460px", overflowY: "auto" }}
          >
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
            {!!draft && (
              <div className="flex justify-start">
                <div
                  className="whitespace-pre-wrap rounded-2xl border px-4 py-3 text-[14px] leading-relaxed shadow-[0_14px_38px_rgba(15,23,42,0.06)]"
                  style={{ borderColor: "var(--rt-border)", background: "rgba(255,255,255,0.94)", color: "var(--rt-charcoal)" }}
                >
                  {draft}
                  <span className="ml-1 animate-pulse">▍</span>
                </div>
              </div>
            )}
          </div>

          <form className="border-t px-6 py-5" style={{ borderColor: "var(--rt-border)" }} onSubmit={onSubmit}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input
                  className="h-12 w-full rounded-full border px-4 text-[14px] outline-none transition focus:border-black"
                  style={{ borderColor: "var(--rt-border)", background: "rgba(255,255,255,0.95)" }}
                  placeholder="“Sofia Richie welcome dinner in Capri, 24°C sea breeze”"
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
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn min-w-[110px]"
                style={{ opacity: loading || !input.trim() ? 0.6 : 1 }}
              >
                {loading ? "Styling…" : "Send"}
              </button>
            </div>
          </form>
        </section>

        <LookBuilder text={combinedText} />
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-4 space-y-5">
          <PreferencesPanel value={prefs} onChange={setPrefs} />
          <div
            className="rounded-3xl border px-5 py-5 text-sm shadow-[0_24px_46px_rgba(15,23,42,0.08)]"
            style={{ borderColor: "var(--rt-border)", background: "rgba(255,255,255,0.96)" }}
          >
            <p className="text-[14px] font-semibold">How to get couture-level answers</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed" style={{ color: "var(--rt-charcoal)" }}>
              <li>Anchor each ask with muse, venue, and your preferred palette.</li>
              <li>Preferences here sync automatically — no need to repeat sizes.</li>
              <li>Ask for alternates or swaps mid-conversation to remix the look.</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
