// components/useStylistChat.ts
"use client";

import { useCallback, useRef, useState } from "react";
import { consumeSSEChunk, SSEEvent } from "@/lib/sse/reader";

export type Msg = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  meta?: any;
};

type SendOptions = {
  text?: string;
  imageUrl?: string;
  preferences?: any;
};

function formatHistory(messages: Msg[]) {
  return messages.map((mm) => {
    if (mm.role !== "user") {
      return { role: mm.role, content: mm.content } as const;
    }
    if (mm.meta?.imageUrl) {
      return {
        role: "user" as const,
        content: [
          { type: "text", text: mm.content },
          { type: "image_url", image_url: { url: mm.meta.imageUrl } },
        ],
      };
    }
    return { role: "user" as const, content: mm.content };
  });
}

export function useStylistChat(endpoint = "/api/chat") {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const carryRef = useRef("");

  const send = useCallback(
    async ({ text, imageUrl, preferences }: SendOptions) => {
      if (!text && !imageUrl) return;

      const userMessage: Msg = {
        id: crypto.randomUUID(),
        role: "user",
        content: text || "(image only)",
        meta: imageUrl ? { imageUrl } : undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setDraft("");
      setLoading(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      carryRef.current = "";

      const history = formatHistory(messages);
      const finalUser = imageUrl
        ? {
            role: "user" as const,
            content: [
              { type: "text", text: text || "" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          }
        : { role: "user" as const, content: text || "" };

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          signal: abortRef.current.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...history, finalUser], preferences }),
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "Network error. Please try again." },
        ]);
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "Sorry—something went wrong. Try again." },
        ]);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let lastBeat = Date.now();
      const WATCHDOG = 30_000;
      const heartbeat = setInterval(() => {
        if (Date.now() - lastBeat > WATCHDOG) {
          abortRef.current?.abort();
        }
      }, 5_000);

      const handleEvent = (evt: SSEEvent) => {
        lastBeat = Date.now();
        switch (evt.event) {
          case "ready":
          case "ping":
            break;
          case "assistant_draft_delta":
          case "assistant_delta":
            if (typeof evt.data?.text === "string") {
              setDraft((prev) => prev + evt.data.text);
            }
            break;
          case "assistant_draft_done":
            break;
          case "tool_call":
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "tool",
                content: `🔎 ${evt.data?.name || "tool"}…`,
                meta: evt.data,
              },
            ]);
            break;
          case "tool_result":
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "tool",
                content: evt.data?.ok ? "✅ results received" : "⚠️ tool error",
                meta: evt.data,
              },
            ]);
            break;
          case "assistant_final":
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: typeof evt.data?.text === "string" ? evt.data.text : "",
              },
            ]);
            setDraft("");
            break;
          case "error":
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "assistant", content: "Sorry—something went wrong. Try again." },
            ]);
            setDraft("");
            break;
          case "done":
            setLoading(false);
            break;
          default:
            break;
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          carryRef.current = consumeSSEChunk(chunk, carryRef.current, handleEvent);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "Stream aborted. Please try again." },
        ]);
      } finally {
        clearInterval(heartbeat);
        setLoading(false);
      }
    },
    [endpoint, messages]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return { messages, draft, send, stop, loading };
}
