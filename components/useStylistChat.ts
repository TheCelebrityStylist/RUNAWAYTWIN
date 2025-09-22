// FILE: components/useStylistChat.ts
"use client";

import { useCallback, useRef, useState } from "react";

/** Public message type used by StylistChat.tsx */
export type Msg = { role: "user" | "assistant" | "system"; content: string };

type UseChatState = {
  messages: Msg[];
  draft: string;          // <- included for compatibility with your UI
  loading: boolean;
  send: (text: string) => Promise<void>;
  stop: () => void;
  reset: (seed?: Msg[]) => void;
};

type Prefs = Record<string, unknown>;

/**
 * Flexible signature:
 * - useStylistChat("/api/chat", initialMessages?, preferences?)
 * - useStylistChat(initialMessages?, preferences?)  // endpoint defaults to "/api/chat"
 */
export function useStylistChat(
  a?: string | Msg[],
  b?: Msg[] | Prefs,
  c?: Prefs
): UseChatState {
  const endpoint = typeof a === "string" ? a : "/api/chat";
  const initialMessages = (Array.isArray(a) ? a : (Array.isArray(b) ? b : [])) as Msg[];
  const preferences = (typeof a === "string" ? (b as Prefs) : (c as Prefs)) || {};

  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(""); // non-streaming: stays empty for now
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setDraft("");
  }, []);

  const reset = useCallback((seed?: Msg[]) => {
    stop();
    setMessages(seed ?? []);
  }, [stop]);

  const send = useCallback(async (text: string) => {
    const prompt = (text || "").trim();
    if (!prompt || loading) return;

    // Optimistically show the user message
    const next = [...messages, { role: "user", content: prompt } as Msg];
    setMessages(next);
    setLoading(true);
    setDraft(""); // clear any previous streaming residue

    // Abort any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, preferences }),
      });

      const replyText = await res.text(); // API returns plain text body
      const content =
        replyText && replyText.trim()
          ? replyText
          : "I hit a hiccup finishing the look—try again in a moment.";

      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry—something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setDraft("");
      abortRef.current = null;
    }
  }, [messages, preferences, loading, endpoint]);

  return { messages, draft, loading, send, stop, reset };
}
