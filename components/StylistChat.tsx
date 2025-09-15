"use client";

import React, { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export default function StylistChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome, love ✨  Tell me your muse + occasion + budget and I’ll style you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll to latest
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // Show the user message immediately
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      // Call your chat API (make sure /api/chat route exists)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a helpful stylist." },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const data = await res.json(); // expecting { reply: string }
      const reply =
        (data && (data.reply as string)) ||
        "I couldn’t fetch a reply just now, but I’m here to help.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Oops—something went wrong fetching my reply. Please try again in a moment.",
        },
      ]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[440px] flex-col overflow-hidden rounded-2xl">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li key={i} className="flex">
              <div
                className={[
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
                  m.role === "assistant"
                    ? "bg-neutral-50 text-neutral-800"
                    : "ml-auto bg-black text-white",
                ].join(" ")}
              >
                {m.content}
              </div>
            </li>
          ))}
          {loading && (
            <li className="flex">
              <div className="max-w-[85%] rounded-2xl bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-800 shadow-sm">
                Thinking…
              </div>
            </li>
          )}
        </ul>
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-200 bg-white p-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Dress me like Zendaya for a party — mid"
            className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
