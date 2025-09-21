"use client";

import { useCallback, useRef, useState } from "react";
import { consumeSSEChunk, SSEEvent } from "@/lib/sse/reader";
import type { ChatMessageRecord } from "@/lib/chat/types";

export type Msg = ChatMessageRecord;

type SendOptions = {
  text?: string;
  imageUrl?: string;
  preferences?: any;
};

type SendResult = {
  ok: boolean;
  error?: string;
};

function formatHistory(messages: Msg[]) {
  return messages.map((mm) => {
    if (mm.role !== "user") {
      return { role: mm.role, content: mm.content } as const;
    }
    if (mm.meta && typeof mm.meta === "object" && "imageUrl" in mm.meta && typeof mm.meta.imageUrl === "string") {
      return {
        role: "user" as const,
        content: [
          { type: "text", text: mm.content },
          { type: "image_url", image_url: { url: mm.meta.imageUrl as string } },
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
  const [lastError, setLastError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const carryRef = useRef("");

  const hydrate = useCallback((records: Msg[]) => {
    setMessages(records);
  }, []);

  const send = useCallback(
    async ({ text, imageUrl, preferences }: SendOptions): Promise<SendResult> => {
      if (!text && !imageUrl) return { ok: false, error: "Say something first" };

      const userMessage: Msg = {
        id: crypto.randomUUID(),
        role: "user",
        content: text || "(image only)",
        meta: imageUrl ? { imageUrl } : null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setDraft("");
      setLoading(true);
      setLastError(null);

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
          body: JSON.stringify({ messages: history, finalUser, preferences }),
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Network error. Please try again.",
            createdAt: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        setLastError("network");
        return { ok: false, error: "network" };
      }

      if (!res.ok || !res.body) {
        const errorText = res.status === 402 ? "Upgrade to continue" : "Sorry—something went wrong.";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: errorText,
            createdAt: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        setLastError(errorText);
        return { ok: false, error: errorText };
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
          case "notice":
            if (typeof evt.data?.text === "string") {
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: evt.data.text,
                  createdAt: new Date().toISOString(),
                },
              ]);
            }
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
                createdAt: new Date().toISOString(),
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
                createdAt: new Date().toISOString(),
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
                createdAt: new Date().toISOString(),
              },
            ]);
            setDraft("");
            break;
          case "error":
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "Sorry—something went wrong. Try again.",
                createdAt: new Date().toISOString(),
              },
            ]);
            setDraft("");
            setLastError("server");
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
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Stream aborted. Please try again.",
            createdAt: new Date().toISOString(),
          },
        ]);
        setLastError("aborted");
      } finally {
        clearInterval(heartbeat);
        setLoading(false);
      }

      return { ok: true };
    },
    [endpoint, messages],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return { messages, draft, send, stop, loading, lastError, hydrate };
}
