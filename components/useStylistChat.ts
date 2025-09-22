// FILE: components/useStylistChat.ts
"use client";

import { useCallback, useRef, useState } from "react";

type Message = { role: "user" | "assistant" | "system"; content: string };

export function useStylistChat(initialMessages: Message[] = [], preferences: any = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    if (!text?.trim() || loading) return;
    const next = [...messages, { role: "user", content: text.trim() } as Message];
    setMessages(next);
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, preferences }),
      });

      // API returns plain text; never stream
      const reply = await res.text();
      setMessages((m) => [...m, { role: "assistant", content: reply || "…" }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry—something went wrong. Try again." }]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, preferences, loading]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  return { messages, send, stop, loading };
}
