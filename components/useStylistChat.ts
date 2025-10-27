// FILE: components/useStylistChat.ts
"use client";

import { useState, useEffect, useCallback } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

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
    if (!input.trim()) return;
    const newMsg: Message = { role: "user", content: input.trim() };

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
        body: JSON.stringify({ input }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

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

  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;

    // Handle primitives safely
    if (typeof v === "string") {
      const t = v.trim();
      if (t !== "") (out as any)[k] = t;
      continue;
    }

    if (typeof v === "number") {
      (out as any)[k] = v;
      continue;
    }

    if (Array.isArray(v)) {
      const filtered = v.filter((el) => el != null && el !== "");
      if (filtered.length > 0) (out as any)[k] = filtered;
      continue;
    }

    if (typeof v === "object") {
      const nested = sanitize(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) (out as any)[k] = nested;
      continue;
    }
  }

  return out;
}
