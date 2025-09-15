"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UiMsg = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  meta?: Record<string, any>;
};

type Prefs = {
  country?: string;
  top?: string;
  bottom?: string;
  shoe?: string;
  bodyType?: string;
  budgetTier?: string;
};

const decoder = new TextDecoder();

/** Parse a chunk of SSE text into frames of { event, data } */
function parseSSE(buffer: string) {
  const frames: Array<{ event: string; data: any }> = [];
  const blocks = buffer.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    const dataStr = dataLines.join("\n");
    if (!dataStr) continue;
    try {
      frames.push({ event, data: JSON.parse(dataStr) });
    } catch {
      // tolerate non-JSON data
      frames.push({ event, data: dataStr });
    }
  }
  return frames;
}

export default function StylistChat() {
  // UI state
  const [messages, setMessages] = useState<UiMsg[]>([
    {
      id: "sys-welcome",
      role: "assistant",
      content:
        "Welcome, love ✨ Tell me your muse + occasion + budget and I’ll style you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // read simple prefs directly from DOM (your left panel)
  const prefs: Prefs = useMemo(() => {
    if (typeof document === "undefined") return {};
    const pick = (sel: string) =>
      (document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null)?.value?.trim();
    return {
      country: pick("select:has(option:checked[value='EU Stock']), select:has(option:checked[value='US Stock'])") || pick("select"),
      top: pick("label:contains('Top size') ~ input") || pick("input[aria-label='Top size']"),
      bottom: pick("label:contains('Bottom size') ~ input") || pick("input[aria-label='Bottom size']"),
      shoe: pick("label:contains('Shoe EU') ~ input") || pick("input[aria-label='Shoe EU']"),
      bodyType: pick("label:contains('Body type') ~ select"),
      budgetTier: pick("label:contains('Budget tier') ~ select"),
    };
  }, [sending]); // refresh when sending

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, toolStatus]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setToolStatus(null);

    const userMsg: UiMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.role !== "tool")
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          prefs, // sent to the API; it will soft-use them
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat API returned ${res.status}`);
      }

      // streaming consume
      const reader = res.body.getReader();
      let buf = "";
      let liveDraftId: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Process SSE frames whenever we have at least one block
        const lastSplit = buf.lastIndexOf("\n\n");
        if (lastSplit === -1) continue;
        const chunk = buf.slice(0, lastSplit + 2);
        buf = buf.slice(lastSplit + 2);

        for (const frame of parseSSE(chunk)) {
          const { event, data } = frame;

          if (event === "heartbeat" || event === "open") continue;

          if (event === "tool-start") {
            setToolStatus(`Searching: ${data?.name ?? "tool"}…`);
            continue;
          }

          if (event === "tool-result") {
            setToolStatus(null);
            // Optionally surface a tiny “tool” message
            if (data?.name) {
              setMessages((m) => [
                ...m,
                {
                  id: `tool-${Date.now()}`,
                  role: "tool",
                  content: `Got results from ${data.name}.`,
                  meta: data?.result,
                },
              ]);
            }
            continue;
          }

          if (event === "final") {
            setToolStatus(null);
            // collapse any draft into the final
            if (liveDraftId) {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === liveDraftId ? { ...msg, content: data?.content ?? msg.content } : msg
                )
              );
              liveDraftId = null;
            } else {
              setMessages((m) => [
                ...m,
                {
                  id: `as-${Date.now()}`,
                  role: "assistant",
                  content: data?.content ?? "",
                },
              ]);
            }
            continue;
          }

          if (event === "message" && data?.type === "assistant-draft") {
            // live streaming text
            if (!liveDraftId) {
              liveDraftId = `draft-${Date.now()}`;
              setMessages((m) => [
                ...m,
                { id: liveDraftId!, role: "assistant", content: data.content ?? "" },
              ]);
            } else {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === liveDraftId ? { ...msg, content: data.content ?? msg.content } : msg
                )
              );
            }
            continue;
          }

          if (event === "error") {
            setToolStatus(null);
            setError(
              data?.message ||
                "Something went wrong while styling. Tell me your muse + occasion + budget and I’ll retry."
            );
            continue;
          }
        }
      }
    } catch (e: any) {
      setToolStatus(null);
      setError(e?.message || "Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }, [input, messages, prefs, sending]);

  // Allow Enter to send; Shift+Enter for newline
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl bg-white">
      {/* Chat window */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
        aria-busy={sending}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-2xl bg-black px-4 py-2 text-sm text-white"
                : m.role === "tool"
                ? "mx-auto max-w-[80%] rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-600"
                : "mr-auto max-w-[80%] rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-800"
            }
          >
            {m.content}
          </div>
        ))}

        {toolStatus && (
          <div className="mr-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] text-neutral-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {toolStatus}
          </div>
        )}

        {error && (
          <div className="mr-auto max-w-[80%] rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-200 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-2"
        >
          <textarea
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
            placeholder="e.g., Dress me like Zendaya for a party — mid"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex h-[44px] items-center rounded-xl bg-black px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
