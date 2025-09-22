// FILE: components/useStylistChat.ts
"use client";

import { useCallback, useRef, useState } from "react";

/** Public message type used by the chat UI */
export type Msg = { role: "user" | "assistant" | "system"; content: string };

/**
 * Preferences shared with the API on every turn.
 * Notes:
 * - budget stays STRING like "€300–€600"
 * - styleKeywords can be string OR string[] (panel often emits string[])
 */
export type Prefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budget?: string;                  // e.g. "€300–€600"
  country?: string;
  currency?: string;                // e.g. "EUR"
  styleKeywords?: string | string[]; // <— accept both
  heightCm?: number | string;
  weightKg?: number | string;
};

type UseChatState = {
  messages: Msg[];
  draft: string;     // reserved for streaming; empty in this non-stream variant
  loading: boolean;
  send: (text: string) => Promise<void>;
  stop: () => void;
  reset: (seed?: Msg[]) => void;
};

/**
 * Hook signature:
 *   useStylistChat("/api/chat", initialMessages?, preferences?)
 *   useStylistChat(initialMessages?, preferences?) // endpoint defaults to "/api/chat"
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
  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setDraft("");
  }, []);

  const reset = useCallback((seed?: Msg[]): void => {
    stop();
    setMessages(seed ?? []);
  }, [stop]);

  // Shallow sanitize: trim strings, drop empties, and normalize styleKeywords
  function sanitizePrefs(p: Prefs): Prefs {
    const out: Prefs = {};
    for (const [k, v] of Object.entries(p || {})) {
      if (k === "styleKeywords") {
        if (Array.isArray(v)) {
          const joined = v.map(s => String(s).trim()).filter(Boolean).join(", ");
          if (joined) (out as any)[k] = joined;      // send as string
        } else if (typeof v === "string") {
          const t = v.trim();
          if (t) (out as any)[k] = t;
        }
        continue;
      }

      if (typeof v === "string") {
        const t = v.trim();
        if (t) (out as any)[k] = t;
      } else if (v !== undefined && v !== null && v !== "") {
        (out as any)[k] = v;
      }
    }
    return out;
  }

  const send = useCallback(async (text: string): Promise<void> => {
    const prompt = (text || "").trim();
    if (!prompt || loading) return;

    const next = [...messages, { role: "user", content: prompt } as Msg];
    setMessages(next);
    setLoading(true);
    setDraft("");

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          preferences: sanitizePrefs(preferences),
        }),
      });

      // The API returns a plain text response (final assistant text)
      const replyText = await res.text();
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

export default useStylistChat;
