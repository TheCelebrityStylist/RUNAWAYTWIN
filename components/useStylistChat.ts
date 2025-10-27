// FILE: components/useStylistChat.ts
"use client";

import { useState, useCallback } from "react";
import type { Message as _Message } from "@/lib/types";

// Re-export expected types for backward compatibility
export type { Msg } from "@/lib/types";
export type Message = _Message;

export function useStylistChat(
  endpoint: string = "/api/chat",
  initial?: _Message[],
  prefs?: Record<string, unknown>
) {
  const [messages, setMessages] = useState<_Message[]>(initial ?? []);
  const [draft, setDraft] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const send = useCallback(
    async (input?: string) => {
      const text = (input ?? draft).trim();
      if (!text) return;

      // push user message first
      const userMsg: _Message = { role: "user", content: text };
      setMessages((m) => [...m, userMsg]);
      setDraft("");
      setLoading(true);
      setError(undefined);

      try {
        const body: Record<string, unknown> = { input: text };
        // Backward-compat with your route that expects { messages, preferences }
        const legacyBody = {
          messages: [{ role: "user", content: text }],
          preferences: prefs ?? {},
        };

        // Prefer streaming route shape (current route supports both shapes)
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Try legacy shape if needed by swapping body variable:
          body: JSON.stringify(legacyBody),
        });

        // Prepare an assistant message slot for progressive updates
        let assistantIndex = -1;
        setMessages((m) => {
          assistantIndex = m.length;
          return [...m, { role: "assistant", content: "" }];
        });

        const contentType = res.headers.get("content-type") || "";
        const isStream = res.body && contentType.includes("text/plain");

        if (isStream && res.body) {
          // Progressive streaming consumption
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let acc = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            acc += chunk;

            // apply sanitized partial
            setMessages((m) => {
              const next = [...m];
              const cur = (next[assistantIndex]?.content as string) ?? "";
              next[assistantIndex] = {
                role: "assistant",
                content: cur + chunk,
              };
              return next;
            });
          }

          // final sanitize pass
          const finalText = acc.trim();
          setMessages((m) => {
            const next = [...m];
            next[assistantIndex] = {
              role: "assistant",
              content: finalText || "(no reply)",
            };
            return next;
          });
        } else {
          // Non-streaming fallback (JSON or plain text)
          let replyText = "";
          if (contentType.includes("application/json")) {
            const data = (await res.json()) as { reply?: string };
            replyText = data.reply ?? "";
          } else {
            replyText = await res.text();
          }
          setMessages((m) => {
            const next = [...m];
            if (assistantIndex === -1) assistantIndex = m.length;
            next[assistantIndex] = {
              role: "assistant",
              content: replyText || "(no reply)",
            };
            return next;
          });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [draft, endpoint, prefs]
  );

  // Legacy alias kept
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
