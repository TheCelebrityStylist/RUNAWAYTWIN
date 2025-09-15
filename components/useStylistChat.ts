// components/useStylistChat.ts
"use client";

import { useCallback, useRef, useState } from "react";

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

type SSEHandler = (event: string, data: any) => void;

function parseSSE(chunk: string, handle: SSEHandler, carry = "") {
  let buf = carry + chunk;
  let idx: number;
  while ((idx = buf.indexOf("\n\n")) !== -1) {
    const raw = buf.slice(0, idx);
    buf = buf.slice(idx + 2);
    let event = "message";
    let dataStr = "";
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
    }
    let payload: any = null;
    if (dataStr) {
      try {
        payload = JSON.parse(dataStr);
      } catch {
        payload = dataStr;
      }
    }
    handle(event, payload);
  }
  return buf;
}

export function useStylistChat(endpoint = "/api/chat") {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async ({ text, imageUrl, preferences }: SendOptions) => {
      if (!text && !imageUrl) return;

      const user: Msg = {
        id: crypto.randomUUID(),
        role: "user",
        content: text || "(image only)",
        meta: imageUrl ? { imageUrl } : undefined,
      };
      setMessages((m) => [...m, user]);
      setDraft("");
      setLoading(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Build conversation with multi-part image messages when present
      const history = messages.map((mm) => {
        if (mm.role !== "user") return { role: mm.role, content: mm.content } as const;
        if (mm.meta?.imageUrl) {
          return {
            role: "user",
            content: [
              { type: "text", text: mm.content },
              { type: "image_url", image_url: { url: mm.meta.imageUrl } },
            ],
          } as const;
        }
        return { role: "user", content: mm.content } as const;
      });

      const last =
        imageUrl
          ? {
              role: "user",
              content: [
                { type: "text", text: text || "" },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            }
          : { role: "user", content: text || "" };

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          signal: abortRef.current.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...history, last], preferences }),
        });
      } catch (err) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", content: "Network error. Please try again." },
        ]);
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "assistant", content: "Sorry—something went wrong. Try again." },
        ]);
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let carry = "";

      // Watchdog: if no bytes for 30s, abort.
      let lastBeat = Date.now();
      const T_IDLE = 30_000;
      const heartbeat = setInterval(() => {
        if (Date.now() - lastBeat > T_IDLE) {
          abortRef.current?.abort();
        }
      }, 5_000);

      const onEvent: SSEHandler = (event, data) => {
        lastBeat = Date.now();

        switch (event) {
          case "ready":
          case "ping":
            break;
          case "assistant_draft_delta":
          case "assistant_delta":
            setDraft((d) => d + (data?.text || ""));
            break;
          case "assistant_draft_done":
            break;
          case "tool_call":
            setMessages((m) => [
              ...m,
              { id: crypto.randomUUID(), role: "tool", content: `🔎 ${data?.name || "tool"}…` },
            ]);
            break;
          case "tool_result":
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "tool",
                content: data?.ok ? "✅ results received" : "⚠️ tool error",
                meta: data,
              },
            ]);
            break;
          case "assistant_final":
            setMessages((m) => [
              ...m,
              { id: crypto.randomUUID(), role: "assistant", content: data?.text || "" },
            ]);
            setDraft("");
            break;
          case "error":
            setMessages((m) => [
              ...m,
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
          carry = parseSSE(chunk, onEvent, carry);
        }
      } catch (err) {
        setMessages((m) => [
          ...m,
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
