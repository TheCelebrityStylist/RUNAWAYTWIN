// FILE: components/useStylistChat.ts
"use client";

import { useState, useCallback } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}
export type Msg = Message; // compatibility with existing imports

export interface ChatState {
  messages: Message[];
  loading: boolean;
  error?: string;
}

export function useStylistChat(
  endpoint: string = "/api/chat",
  initial?: Message[],
  prefs?: Record<string, unknown>
) {
  const [messages, setMessages] = useState<Message[]>(initial ?? []);
  const [draft, setDraft] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const send = useCallback(
    async (input?: string) => {
      const text = (input ?? draft).trim();
      if (!text) return;

      const userMsg: Message = { role: "user", content: text };
      setMessages((m) => [...m, userMsg]);
      setDraft("");
      setLoading(true);
      setError(undefined);

      try {
        const body: Record<string, unknown> = { input: text };
        if (prefs && Object.keys(prefs).length > 0) {
          body.prefs = sanitize(prefs);
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Support both JSON and text replies (some routes may stream/flush plain text)
        let replyText = "";
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const data = (await res.json()) as { reply?: string };
          replyText = data.reply ?? "";
        } else {
          replyText = await res.text();
        }

        const assistantMsg: Message = {
          role: "assistant",
          content: replyText || "(no reply)",
        };
        setMessages((m) => [...m, assistantMsg]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [draft, endpoint, prefs]
  );

  // Legacy name kept for any other components
  const sendMessage = send;

  return {
    messages,
    draft,
    setDraft,
    send,
    sendMessage,
    loading,
    error,
  };
}

/**
 * Utility: sanitize preference objects before sending to API
 * (removes null/undefined/empty-string fields, trims strings, prunes empties)
 */
export function sanitize<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};

  for (const [key, value] of Object.entries(obj) as [keyof T, T[keyof T]][]) {
    if (value === undefined || value === null) continue;

    if (typeof value === "string") {
      const t = value.trim();
      if (t !== "") out[key] = t as T[keyof T];
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value as T[keyof T];
      continue;
    }

    if (Array.isArray(value)) {
      const filtered = (value as unknown[]).map((v) => (typeof v === "string" ? v.trim() : v)).filter((v) => v !== "" && v !== null && v !== undefined);
      if (filtered.length > 0) out[key] = filtered as unknown as T[keyof T];
      continue;
    }

    if (typeof value === "object") {
      const nested = sanitize(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[key] = nested as unknown as T[keyof T];
      continue;
    }
  }

  return out;
}
