// FILE: components/useStylistChat.ts
"use client";

import { useState, useEffect, useCallback } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}
export type Msg = Message; // <- alias for backwards-compat with StylistChat.tsx

export interface ChatState {
  messages: Message[];
  loading: boolean;
  error?: string;
}

export function useStylistChat(initial?: Message[]) {
  const [state, setState] = useState<ChatState>({
    messages: initial ?? [],
    loading: false,
  });

  const sendMessage = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMsg: Message = { role: "user", content: trimmed };

    setState((s) => ({
      ...s,
      messages: [...s.messages, newMsg],
      loading: true,
      error: undefined,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { reply?: string } = await res.json();

      const reply: Message = {
        role: "assistant",
        content: data.reply ?? "(no reply)",
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, reply],
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  return {
    ...state,
    sendMessage,
  };
}

/**
 * Utility: sanitize preference objects before sending to API
 * (removes null/undefined/empty-string fields)
 */
export function sanitize<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};

  for (const [k, v] of Object.entries(obj) as [keyof T, T[keyof T]][]) {
    if (v === undefined || v === null) continue;

    if (typeof v === "string") {
      const t = v.trim();
      if (t !== "") out[k] = t as T[keyof T];
      continue;
    }

    if (typeof v === "number") {
      out[k] = v as T[keyof T];
      continue;
    }

    if (Array.isArray(v)) {
      const filtered = (v as unknown[]).filter((el) => el != null && el !== "");
      if (filtered.length > 0) out[k] = filtered as unknown as T[keyof T];
      continue;
    }

    if (typeof v === "object") {
      const nested = sanitize(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[k] = nested as unknown as T[keyof T];
      continue;
    }
  }

  return out;
}
