// app/api/chat/route.ts
export const runtime = "edge";
// If you're deploying on Vercel Edge and want global availability,
// you can optionally pin a region, but it's not required.
// export const preferredRegion = "iad1";

import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, runTool } from "./tools";
import { getSession } from "@/lib/auth/session";
import { getUserById, updateUser, type UserRecord } from "@/lib/storage/user";
import { appendHistory } from "@/lib/storage/history";
import { mergePreferences } from "@/lib/preferences/utils";
import type { Preferences } from "@/lib/preferences/types";
import { normalizeMessage, type ChatMessageRecord } from "@/lib/chat/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const GUEST_COOKIE = "rt_guest_free";

/** ---------- Utilities ---------- */

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string | any }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCallDelta = {
  id?: string;
  function?: { name?: string; arguments?: string };
  type?: "function";
  index?: number;
};

function sse(event: string, data: unknown) {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}

function safeJSON(s: string) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

function prefsToSystem(prefs: any) {
  const {
    gender = "unspecified",
    sizes = {},
    bodyType = "",
    budget = "",
    country = "",
    styleKeywords = [],
    height = "",
    weight = "",
  } = prefs || {};

  const sizeStr = Object.entries(sizes || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return [
    `### USER PROFILE`,
    `Gender: ${gender}`,
    `Sizes: ${sizeStr || "n/a"}`,
    `Body type: ${bodyType || "n/a"}`,
    `Height/Weight (optional): ${[height, weight].filter(Boolean).join(" / ") || "n/a"}`,
    `Budget: ${budget || "n/a"} (respect this; show per-item + total)`,
    `Country: ${country || "n/a"} (prefer local/EU/US stock & sizing)`,
    `Style keywords: ${styleKeywords.join(", ") || "n/a"}`,
    ``,
    `### OUTPUT CHECKLIST`,
    `• Follow the structured format defined in the system prompt.`,
    `• Use only tool-sourced items and links; no fabrication.`,
    `• Budget line must state total and whether it meets the user's range.`,
    `• Body-type logic should reference rise, drape, neckline, hem or fabrication.`,
    `• Alternates must include footwear and outerwear with working links.`,
  ].join("\n");
}

function resolvePreferences(userPref: Preferences | undefined, incoming: any): Preferences {
  const override: Partial<Preferences> = typeof incoming === "object" && incoming
    ? {
        ...incoming,
        sizes: { ...(incoming.sizes || {}) },
        styleKeywords: Array.isArray(incoming.styleKeywords)
          ? incoming.styleKeywords.filter((word: unknown) => typeof word === "string")
          : undefined,
      }
    : {};
  return mergePreferences(userPref, override);
}

type UsageTicket = {
  allowed: boolean;
  reason?: string;
  refund?: () => Promise<void>;
  label?: "free" | "credit" | "subscription" | "guest";
};

type UsageOutcome = {
  ticket: UsageTicket;
  user: UserRecord | null;
  setCookie?: string | null;
};

async function reserveUsage(user: UserRecord | null, guestCookie: string | undefined): Promise<UsageOutcome> {
  if (user) {
    if (user.subscriptionActive) {
      return { ticket: { allowed: true, label: "subscription" }, user };
    }
    if (!user.freeLookUsed) {
      const updated = await updateUser(user.id, { freeLookUsed: true });
      return {
        ticket: {
          allowed: true,
          label: "free",
          refund: async () => {
            await updateUser(user.id, { freeLookUsed: false });
          },
        },
        user: updated,
      };
    }
    if (user.lookCredits > 0) {
      const before = user.lookCredits;
      const updated = await updateUser(user.id, { lookCredits: before - 1, plan: "per_look" });
      return {
        ticket: {
          allowed: true,
          label: "credit",
          refund: async () => {
            await updateUser(user.id, { lookCredits: before });
          },
        },
        user: updated,
      };
    }
    return {
      ticket: {
        allowed: false,
        reason: "You’ve used your looks. Grab a one-off look for $5 or go unlimited for $19/mo.",
      },
      user,
    };
  }

  if (!guestCookie) {
    const maxAge = 60 * 60 * 24 * 365;
    return {
      ticket: { allowed: true, label: "guest" },
      user: null,
      setCookie: `${GUEST_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
    };
  }

  return {
    ticket: {
      allowed: false,
      reason: "Create a free account to unlock your saved looks and continue styling.",
    },
    user: null,
  };
}

function lastUserText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      const textPart = m.content.find((p: any) => p?.type === "text");
      if (textPart?.text) return textPart.text;
    }
  }
  return "";
}

/** Quick “optimistic” draft that uses tools + prefs so the UI replies instantly. */
async function optimisticDraft(preferences: any, userText: string) {
  const country = preferences?.country || "US";
  const gender = preferences?.gender || "unspecified";
  const styleKeywords: string[] = Array.isArray(preferences?.styleKeywords)
    ? preferences.styleKeywords
    : [];

  const vibe = styleKeywords.length
    ? `Effortless ${styleKeywords.slice(0, 3).join(" ")}`
    : "Polished minimalism";

  const categories = [
    { key: "top", category: "Top", fallback: "silk knit top", query: `${vibe} top ${gender}`.trim() },
    { key: "bottom", category: "Bottom", fallback: "tailored wool trouser", query: `${vibe} high-waist trouser ${gender}`.trim() },
    { key: "outer", category: "Outerwear", fallback: "structured wool coat", query: `${vibe} coat ${gender}`.trim() },
    { key: "shoes", category: "Shoes", fallback: "sleek leather ankle boot", query: `${vibe} leather ankle boot ${gender}`.trim() },
    { key: "bag", category: "Bag", fallback: "structured leather shoulder bag", query: `${vibe} leather bag` },
    { key: "accessory", category: "Accessories", fallback: "gold hoop earrings", query: `${vibe} gold hoop` },
  ];

  const toolCalls = await Promise.all(
    categories.map((spec) =>
      runTool(
        "search_products",
        {
          query: spec.query || spec.fallback,
          category: spec.category,
          country,
          limit: 3,
        },
        { preferences }
      ).catch(() => null)
    )
  );

  type Picked = {
    spec: (typeof categories)[number];
    primary: any;
    alternate: any;
  };

  const picks: Picked[] = categories.map((spec, index) => {
    const result = toolCalls[index] as any;
    const items = Array.isArray(result?.items) ? result.items : [];
    return { spec, primary: items[0] || null, alternate: items[1] || null };
  });

  const formatPrice = (item: any) => {
    if (!item?.price) return "price on request";
    const rounded = Math.round(Number(item.price));
    return `${item.currency || "EUR"} ${rounded}`;
  };

  const formatItem = (item: any, category: string) => {
    if (!item) return null;
    const brand = item.brand || "";
    const title = item.title || item.name || "Item";
    const price = formatPrice(item);
    const retailer = item.retailer || item.source || "Retailer";
    const url = item.url || item.link || "";
    const image = item.imageUrl || item.image || url;
    return `- ${category} — ${brand} ${title} (${price}, ${retailer}) · ${url} · Image: ${image}`;
  };

  const outfitLines = picks
    .map((pick) => formatItem(pick.primary, pick.spec.category))
    .filter(Boolean) as string[];

  const totals = new Map<string, number>();
  for (const pick of picks) {
    if (!pick.primary?.price || !pick.primary?.currency) continue;
    const cur = pick.primary.currency.toUpperCase();
    totals.set(cur, (totals.get(cur) || 0) + Number(pick.primary.price));
  }

  const totalText = totals.size
    ? Array.from(totals.entries())
        .map(([currency, amount]) => `${currency} ${Math.round(amount)}`)
        .join(" + ")
    : "mixed currency";

  const budgetLine = preferences?.budget
    ? `Budget: approx ${totalText} (user range: ${preferences.budget}).`
    : `Budget: approx ${totalText}.`;

  const bodyType = (preferences?.bodyType || "frame").toLowerCase();
  const bodyNotesMap: Record<string, string[]> = {
    hourglass: [
      "High-rise tailoring locks in the waist while matching shoulder and hem structure keep lines balanced.",
      "Sculpted knit hugs without flattening curves; streamlined boots extend the leg line.",
    ],
    pear: [
      "Strong shoulder line and long coat shift volume upward while the trouser drapes cleanly over hips.",
      "Pointed boots and vertical seams elongate the leg, avoiding cling at the hip.",
    ],
    rectangle: [
      "Cinched waist detail and curved neckline carve shape through the torso.",
      "Fluid trouser with tapered hem introduces soft contrast against structured outerwear.",
    ],
    apple: [
      "Column coat and relaxed rise create a continuous line that skims the midsection.",
      "Deep V neck and elongated trouser crease draw eyes vertically, not at the core.",
    ],
    "inverted-triangle": [
      "Slight flare in the trouser and pointed boots balance broader shoulders.",
      "Soft knit texture tempers the top block while the coat drapes away from the frame.",
    ],
    petite: [
      "Cropped proportions and unified tones lengthen the line without overwhelming scale.",
      "Clean ankle boot and mid-rise trouser keep the silhouette uninterrupted.",
    ],
    tall: [
      "Break the height with waist emphasis and layered texture at the shoulder.",
      "Long coat with measured vent keeps the stride easy while maintaining structure.",
    ],
    plus: [
      "Smooth tailoring with strategic waist shaping defines curves without cling.",
      "Vertical seams and pointed toe boots stretch the frame elegantly.",
    ],
  };

  const bodyNotes = bodyNotesMap[bodyType] || [
    "Balanced proportions and controlled layers elongate the frame.",
    "Texture mix keeps the look intentional while flattering natural lines.",
  ];

  const alternates: string[] = [];
  const outerAlt = picks.find((p) => p.spec.category === "Outerwear" && p.alternate);
  if (outerAlt?.alternate) {
    const line = formatItem(outerAlt.alternate, outerAlt.spec.category);
    if (line) alternates.push(line);
  }
  const shoeAlt = picks.find((p) => p.spec.category === "Shoes" && p.alternate);
  if (shoeAlt?.alternate) {
    const line = formatItem(shoeAlt.alternate, shoeAlt.spec.category);
    if (line) alternates.push(line);
  }
  for (const pick of picks) {
    if (alternates.length >= 2) break;
    if (pick.alternate) {
      const line = formatItem(pick.alternate, pick.spec.category);
      if (line && !alternates.includes(line)) alternates.push(line);
    }
  }

  const names = Object.fromEntries(
    picks.map((pick) => [pick.spec.key, pick.primary?.title || pick.primary?.name || ""])
  );
  const brands = Object.fromEntries(
    picks.map((pick) => [pick.spec.key, pick.primary?.brand || ""])
  );

  const capsule: string[] = [];
  if (names.top && names.bottom) {
    capsule.push(
      `Pair the ${brands.top} ${names.top} with vintage denim and the ${brands.shoes || ""} ${
        names.shoes || "boots"
      } for off-duty polish.`
    );
  }
  if (names.outer && names.dress) {
    capsule.push(
      `Layer the ${brands.outer || ""} ${names.outer || "coat"} over the ${
        names.dress
      } for evening with metallic jewelry.`
    );
  }
  if (names.bag) {
    capsule.push(
      `Swap in a relaxed tee and keep the ${brands.bag || ""} ${names.bag} to anchor a weekend uniform.`
    );
  }
  while (capsule.length < 2) {
    capsule.push("Rotate the coat over crisp denim and loafers for weekday errands.");
  }

  const tips = [
    "Tailor trouser hems to kiss the boot shaft for an unbroken leg line.",
    "Brush wool with a cashmere comb and store leather with cedar to keep the set pristine.",
  ];

  const lines: string[] = [];
  lines.push(`Vibe: ${vibe} with celebrity-level ease.`);
  lines.push("");
  lines.push("Outfit:");
  if (outfitLines.length) {
    lines.push(...outfitLines);
  } else {
    lines.push("- Look building — fetching products");
  }
  lines.push("");
  lines.push("Body Notes:");
  lines.push(...bodyNotes.map((note) => `- ${note}`));
  lines.push("");
  lines.push(budgetLine);
  lines.push("");
  lines.push("Alternates:");
  if (alternates.length) {
    lines.push(...alternates);
  } else {
    lines.push("- More alternates coming once live tools respond.");
  }
  lines.push("");
  lines.push("Capsule & Tips:");
  for (const idea of capsule.slice(0, 3)) {
    lines.push(`- ${idea}`);
  }
  for (const tip of tips.slice(0, 2)) {
    lines.push(`- Tip: ${tip}`);
  }
  lines.push("");
  if (userText) {
    lines.push(`(Request: “${userText}”)`);
  }

  return lines.join("\n");
}

/** Low-level OpenAI streaming helper (REST + SSE) */
async function* openaiStream(body: any) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    carry += chunk;
    while (true) {
      const idx = carry.indexOf("\n\n");
      if (idx === -1) break;
      const raw = carry.slice(0, idx);
      carry = carry.slice(idx + 2);
      const lines = raw.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          yield { done: true };
          return;
        }
        try {
          yield JSON.parse(data);
        } catch {
          // ignore keep-alives
        }
      }
    }
  }
}

/** ---------- Route ---------- */

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];
  const finalUser = payload?.finalUser;
  const incomingPrefs = payload?.preferences;

  const chatMessages: ChatMessage[] = [...rawMessages];
  if (finalUser) {
    chatMessages.push(finalUser);
  }
  const userText = lastUserText(chatMessages);

  const cookieStore = cookies();
  const guestCookie = cookieStore.get(GUEST_COOKIE)?.value;
  const session = await getSession();
  let userRecord = session?.uid ? await getUserById(session.uid) : null;

  const usageOutcome = await reserveUsage(userRecord, guestCookie);
  const { ticket } = usageOutcome;
  if (usageOutcome.user) {
    userRecord = usageOutcome.user;
  }

  const preferences: Preferences = resolvePreferences(userRecord?.preferences, incomingPrefs);

  const baseMsgs: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: prefsToSystem(preferences) },
    ...chatMessages,
  ];

  if (!ticket.allowed) {
    const reason = ticket.reason || "Upgrade to unlock more looks.";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sse("ready", { ok: false }));
        controller.enqueue(sse("assistant_final", { text: reason }));
        controller.enqueue(sse("done", { ok: false }));
        controller.close();
      },
    });
    const headers = new Headers({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    if (usageOutcome.setCookie) {
      headers.append("Set-Cookie", usageOutcome.setCookie);
    }
    return new Response(stream, { status: 200, headers });
  }

  const historyRecords: ChatMessageRecord[] = [];
  if (userRecord && userText) {
    historyRecords.push(
      normalizeMessage({
        role: "user",
        content: userText,
        meta: { ticket: ticket.label, preferences },
      }),
    );
  }

  const tools = (toolSchemas || []).map((fn) => ({
    type: "function",
    function: { name: fn.name, description: fn.description, parameters: fn.schema },
  }));

  const stream = new ReadableStream({
    async start(controller) {
      // initial liveness
      controller.enqueue(sse("ready", { ok: true }));
      const statusText = (() => {
        if (!ticket.label) return null;
        if (ticket.label === "subscription") return "Unlimited plan active — concierge styling unlocked.";
        if (ticket.label === "credit") {
          const remaining = typeof userRecord?.lookCredits === "number" ? userRecord.lookCredits : null;
          return remaining !== null
            ? `One look credit applied. ${remaining} remaining.`
            : "One look credit applied.";
        }
        if (ticket.label === "free") return "Welcome look unlocked — let’s dress you.";
        if (ticket.label === "guest") return "Guest look unlocked. Create an account to save it.";
        return null;
      })();
      if (statusText) {
        controller.enqueue(sse("notice", { text: statusText }));
      }
      const pinger = setInterval(() => controller.enqueue(sse("ping", { t: Date.now() })), 15000);
      let finalDelivered = false;
      const finalize = async (ok: boolean, finalText: string) => {
        if (finalDelivered) return;
        finalDelivered = true;
        if (ok && userRecord && historyRecords.length) {
          const trimmed = (finalText || "").trim();
          if (trimmed) {
            historyRecords.push(
              normalizeMessage({
                role: "assistant",
                content: finalText,
              }),
            );
          }
          try {
            await appendHistory(userRecord.id, historyRecords);
          } catch (err) {
            console.error("history append failed", err);
          }
        } else if (!ok && ticket.refund) {
          try {
            await ticket.refund();
          } catch (err) {
            console.error("usage refund failed", err);
          }
        }
      };
      const end = async (ok = true, finalText = "") => {
        await finalize(ok, finalText);
        try { controller.enqueue(sse("done", { ok })); } catch {}
        clearInterval(pinger);
        controller.close();
      };

      // 0) **Optimistic draft** — reply instantly using our local generator + tools
      try {
        const draft = await optimisticDraft(preferences, userText);
        for (const chunk of draft.match(/.{1,220}/g) || []) {
          controller.enqueue(sse("assistant_draft_delta", { text: chunk }));
        }
        controller.enqueue(sse("assistant_draft_done", {}));
      } catch {
        // even if this fails, continue to model path
      }

      // 1) **Model path** — try OpenAI; if anything fails, finalize with the optimistic draft already sent
      if (!HAS_OPENAI) {
        controller.enqueue(sse("assistant_final", { text: "" }));
        await end(true, "");
        return;
      }

      const toolCalls: Record<string, { name: string; arguments: string }> = {};
      let accText = "";

      try {
        // 1st hop: stream draft + collect tool calls
        for await (const evt of openaiStream({
          model: "gpt-4o-mini",
          temperature: 0.7,
          stream: true,
          tool_choice: "auto",
          tools,
          messages: baseMsgs,
        })) {
          const choice = (evt as any).choices?.[0];
          if (!choice) continue;

          const delta = choice.delta || {};

          if (typeof delta.content === "string" && delta.content) {
            accText += delta.content;
            controller.enqueue(sse("assistant_delta", { text: delta.content }));
          }

          const tcs = delta.tool_calls as ToolCallDelta[] | undefined;
          if (tcs?.length) {
            for (const d of tcs) {
              const id = d.id!;
              const name = d.function?.name || toolCalls[id]?.name || "unknown";
              const argsChunk = d.function?.arguments || "";
              toolCalls[id] = {
                name,
                arguments: (toolCalls[id]?.arguments || "") + argsChunk,
              };
            }
          }

          if (choice.finish_reason) break;
        }
      } catch {
        controller.enqueue(sse("assistant_final", { text: accText || "" }));
        await end(false, accText);
        return;
      }

      // tools?
      const entries = Object.entries(toolCalls);
      if (entries.length) {
        const toolMsgs: ChatMessage[] = [];

        for (const [id, { name, arguments: argStr }] of entries) {
          const args = safeJSON(argStr);
          controller.enqueue(sse("tool_call", { id, name, args }));
          try {
            const result = await runTool(name, args, { preferences });
            controller.enqueue(sse("tool_result", { id, ok: true, result }));
            toolMsgs.push({ role: "tool", tool_call_id: id, content: JSON.stringify(result) });
          } catch (err: any) {
            controller.enqueue(sse("tool_result", { id, ok: false, error: err?.message || "Tool error" }));
            toolMsgs.push({ role: "tool", tool_call_id: id, content: JSON.stringify({ error: "Tool error" }) });
          }
        }

        // 2nd hop: non-stream final w/ tool results + critique rules
        try {
          const res = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              temperature: 0.4,
              stream: false,
              messages: [
                ...baseMsgs,
                { role: "assistant", content: accText },
                ...toolMsgs,
                {
                  role: "system",
                  content: [
                    "Refine the assistant answer with these checks:",
                    "1) Each item has brand + exact name, price, retailer, tool-derived link.",
                    "2) Body-type reasons explicit (rise, neckline, hem, fabric).",
                    "3) Respect budget; include total and a save option if needed.",
                    "4) Alternates for shoes + outerwear.",
                    "5) 'Capsule & Tips' (2–3 remixes + 2 tips).",
                    "6) No invented links.",
                  ].join("\n"),
                },
              ],
            }),
          });
          const json = await res.json();
          const finalText = json?.choices?.[0]?.message?.content || accText || "";
          controller.enqueue(sse("assistant_final", { text: finalText }));
          await end(true, finalText);
          return;
        } catch {
          controller.enqueue(sse("assistant_final", { text: accText || "" }));
          await end(false, accText);
          return;
        }
      }

      // No tool calls → finalize with streamed model text (or empty if none)
      controller.enqueue(sse("assistant_final", { text: accText || "" }));
      await end(true, accText);
    },
  });

  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  if (usageOutcome.setCookie) {
    headers.append("Set-Cookie", usageOutcome.setCookie);
  }
  return new Response(stream, {
    status: 200,
    headers,
  });
}

