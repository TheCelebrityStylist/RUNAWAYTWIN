// components/useStylistChat.ts
"use client";

import { useCallback, useRef, useState } from "react";
import type { Prefs as PanelPrefs } from "./preferences/PreferencesPanel";

export type Msg = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  meta?: any;
};

type NormalizedPrefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budget?: number;
  country?: string;
  currency?: string;
  styleKeywords?: string;
  heightCm?: number;
  weightKg?: number;
};

type SendOptions = {
  text?: string;
  imageUrl?: string;
  preferences?: PanelPrefs | NormalizedPrefs;
};

function detectCurrency(input: string) {
  if (/[€]/.test(input) || /\bEUR\b/i.test(input)) return "EUR";
  if (/[£]/.test(input) || /\bGBP\b/i.test(input)) return "GBP";
  if (/[¥]/.test(input) || /\bJPY\b/i.test(input)) return "JPY";
  if (/[\$]/.test(input) || /\bUSD\b/i.test(input)) return "USD";
  const iso = input.match(/\b([A-Z]{3})\b/);
  return iso ? iso[1].toUpperCase() : undefined;
}

function parseBudget(input: unknown): { budget?: number; currency?: string } {
  if (typeof input === "number") return { budget: input };
  if (typeof input !== "string") return {};

  const currency = detectCurrency(input);
  const numbers = input.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers) return { currency };

  const values = numbers
    .map((num) => {
      const normalized = num
        .replace(/[\s,](?=\d{3}(?:\D|$))/g, "")
        .replace(/,(\d{1,2})$/, ".$1");
      return parseFloat(normalized);
    })
    .filter((n) => !Number.isNaN(n));

  if (!values.length) return { currency };
  const budget = Math.max(...values);
  return { budget: Number.isFinite(budget) ? Math.round(budget) : undefined, currency };
}

function joinKeywords(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input.trim() || undefined;
  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ") || undefined;
  }
  return undefined;
}

function normalizePreferences(preferences?: PanelPrefs | NormalizedPrefs) {
  if (!preferences) return undefined;

  const maybeNormalized =
    typeof (preferences as NormalizedPrefs).sizeTop === "string" ||
    typeof (preferences as NormalizedPrefs).styleKeywords === "string" ||
    typeof (preferences as NormalizedPrefs).budget === "number";

  if (maybeNormalized && !(preferences as any).sizes) {
    return preferences as NormalizedPrefs;
  }

  const result: NormalizedPrefs = {};

  const gender = (preferences as PanelPrefs).gender;
  if (typeof gender === "string" && gender && gender !== "unspecified") {
    result.gender = gender;
  }

  const sizes = (preferences as PanelPrefs).sizes || ({} as PanelPrefs["sizes"]);
  const top = (sizes as PanelPrefs["sizes"]).top || (preferences as any).sizeTop;
  const bottom = (sizes as PanelPrefs["sizes"]).bottom || (preferences as any).sizeBottom;
  const dress = (sizes as PanelPrefs["sizes"]).dress || (preferences as any).sizeDress;
  const shoe = (sizes as PanelPrefs["sizes"]).shoe || (preferences as any).sizeShoe;

  if (typeof top === "string" && top.trim()) result.sizeTop = top.trim();
  if (typeof bottom === "string" && bottom.trim()) result.sizeBottom = bottom.trim();
  if (typeof dress === "string" && dress.trim()) result.sizeDress = dress.trim();
  if (typeof shoe === "string" && shoe.trim()) result.sizeShoe = shoe.trim();

  const bodyType = (preferences as PanelPrefs).bodyType || (preferences as any).bodyType;
  if (typeof bodyType === "string" && bodyType.trim()) {
    result.bodyType = bodyType.trim();
  }

  const country = (preferences as PanelPrefs).country || (preferences as any).country;
  if (typeof country === "string" && country.trim()) {
    result.country = country.trim();
  }

  const styleKeywords = joinKeywords((preferences as PanelPrefs).styleKeywords ?? (preferences as any).styleKeywords);
  if (styleKeywords) {
    result.styleKeywords = styleKeywords;
  }

  const budgetDetails = parseBudget((preferences as PanelPrefs).budget ?? (preferences as any).budget);
  if (budgetDetails.budget && Number.isFinite(budgetDetails.budget)) {
    result.budget = budgetDetails.budget;
  } else if (typeof (preferences as any).budget === "number") {
    result.budget = (preferences as any).budget;
  }

  const explicitCurrency = (preferences as any).currency;
  if (typeof explicitCurrency === "string" && explicitCurrency.trim()) {
    result.currency = explicitCurrency.trim().toUpperCase();
  } else if (budgetDetails.currency) {
    result.currency = budgetDetails.currency;
  }

  if (typeof (preferences as any).heightCm === "number") {
    result.heightCm = (preferences as any).heightCm;
  }
  if (typeof (preferences as any).weightKg === "number") {
    result.weightKg = (preferences as any).weightKg;
  }

  return Object.keys(result).length ? result : undefined;
}

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

const INITIAL_GREETING: Msg = {
  id: "stylist-welcome",
  role: "assistant",
  content:
    "Hello love — I’m your Ultimate Celebrity Stylist AI. Share your body type, the occasion, and any muses or style cravings, and I’ll craft a shoppable head-to-toe look when you’re ready.",
};

export function useStylistChat(endpoint = "/api/chat") {
  const [messages, setMessages] = useState<Msg[]>(() => [INITIAL_GREETING]);
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

      const preparedPrefs = normalizePreferences(preferences);

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          signal: abortRef.current.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            preparedPrefs
              ? { messages: [...history, last], preferences: preparedPrefs }
              : { messages: [...history, last] }
          ),
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

      const extractText = (payload: any) =>
        typeof payload === "string" ? payload : payload?.text || "";

      const onEvent: SSEHandler = (event, data) => {
        lastBeat = Date.now();

        switch (event) {
          case "ready":
          case "ping":
            break;
          case "assistant_draft_delta":
          case "assistant_delta":
            setDraft((d) => d + extractText(data));
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
              { id: crypto.randomUUID(), role: "assistant", content: extractText(data) },
            ]);
            setDraft("");
            break;
          case "error":
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content:
                  extractText(data) || "Sorry—something went wrong. Try again.",
              },
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
        if (carry) {
          parseSSE("\n\n", onEvent, carry);
          carry = "";
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
