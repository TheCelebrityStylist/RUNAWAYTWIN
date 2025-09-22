// FILE: components/useStylistChat.ts
"use client";

import { useCallback, useRef, useState } from "react";

/** Message type expected by StylistChat.tsx */
export type Msg = { role: "user" | "assistant" | "system"; content: string };

type UseChatState = {
  messages: Msg[];
  loading: boolean;
  send: (text: string) => Promise<void>;
  stop: () => void;
  reset: (seed?: Msg[]) => void;
};

/**
 * Non-streaming chat hook – pairs with /api/chat (Edge, plain text response).
 * Prevents "forever loading" by using a single fetch and hard aborts.
 */
export function useStylistChat(initialMessages: Msg[] = [], preferences: any = {}): UseChatState {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const reset = useCallback((seed?: Msg[]) => {
    stop();
    setMessages(seed ?? []);
  }, [stop]);

  const send = useCallback(async (text: string) => {
    const prompt = (text || "").trim();
    if (!prompt || loading) return;

    // Optimistically append user message
    const next = [...messages, { role: "user", content: prompt } as Msg];
    setMessages(next);
    setLoading(true);

    // Abort any in-flight request
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

      const replyText = await res.text(); // API returns plain text, not SSE
      const content =
        replyText && replyText.trim().length > 0
          ? replyText
          : "I hit a hiccup finishing the look—try again in a moment.";

      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch (_err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry—something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, preferences, loading]);

  return { messages, loading, send, stop, reset };
}
