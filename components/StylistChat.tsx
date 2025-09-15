// components/StylistChat.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant" | "tool"; content: string };

export default function StylistChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome, love ✨ Tell me your muse + occasion + budget and I’ll style you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // auto–scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Chat error");
      }

      // Streaming disabled for simplicity; expect JSON
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I ran into an issue fetching results. Please try again or tweak your request.",
        },
      ]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-neutral-900 px-4 py-3 text-sm text-white"
                : "max-w-[85%] rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-900"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-900">
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., Dress me like Zendaya for a party — mid"
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-900"
        />
        <button
          disabled={loading}
          className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
