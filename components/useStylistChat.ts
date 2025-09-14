import { useCallback, useRef, useState } from "react";

export type Msg = { id: string; role: "user" | "assistant" | "tool"; content: string };

type SendOptions = { text?: string; imageUrl?: string };

export function useStylistChat(endpoint = "/api/chat") {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const send = useCallback(async ({ text, imageUrl }: SendOptions) => {
    if (!text && !imageUrl) return;

    const user: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text ?? "",
    };
    setMessages((m) => [...m, user]);
    setLoading(true);

    // Open SSE stream
    const es = new EventSource(
      endpoint +
        "?" +
        new URLSearchParams({
          // pass a short marker to use GET+SSE in edge reliably
          _sse: "1",
        })
    );
    esRef.current = es;

    // Immediately POST the payload (history + latest message + image)
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        messages: [
          ...messages.map(({ role, content }) => ({ role, content })),
          { role: "user", content: text || "" },
        ],
      }),
    }).catch(() => { /* no-op (SSE will carry the results) */ });

    let assistantId = crypto.randomUUID();
    let buffer = "";

    const commit = () => {
      if (!buffer) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === assistantId);
        const nextMsg = { id: assistantId, role: "assistant" as const, content: buffer };
        if (idx === -1) return [...prev, nextMsg];
        const cloned = prev.slice();
        cloned[idx] = nextMsg;
        return cloned;
      });
    };

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        switch (payload.type) {
          case "assistant-draft": {
            buffer = payload.content || "";
            commit();
            break;
          }
          case "tool-start": {
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "tool",
                content: `🔎 ${payload.name.replace(/_/g, " ")}…`,
              },
            ]);
            break;
          }
          case "tool-result": {
            // You can render payload.result somewhere if useful
            break;
          }
          case "final": {
            buffer = payload.content || buffer;
            commit();
            setLoading(false);
            es.close();
            break;
          }
          case "error": {
            buffer = buffer || "Sorry — I hit an error while styling. Try again in a moment.";
            commit();
            setLoading(false);
            es.close();
            break;
          }
        }
      } catch {
        // ignore malformed lines
      }
    };

    es.onerror = () => {
      setLoading(false);
      es.close();
    };
  }, [endpoint, messages]);

  const stop = useCallback(() => {
    esRef.current?.close();
    setLoading(false);
  }, []);

  return { messages, send, stop, loading };
}
