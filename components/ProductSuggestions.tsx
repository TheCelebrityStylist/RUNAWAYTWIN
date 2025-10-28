// FILE: components/ProductSuggestions.tsx
"use client";

import * as React from "react";
import type { Prefs, Message } from "@/lib/types";
import type { Product } from "@/lib/affiliates/types";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";

type Suggestions = Record<string, Product[]>;

type Props = {
  messages: Message[];
  prefs?: Prefs;
  country?: string;
};

function lastAssistantText(msgs: Message[]): string | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role === "assistant" && typeof m.content === "string") {
      const t = m.content.trim();
      if (t) return t;
    }
  }
  return null;
}

/** Extract simple product categories from the assistant text (works with our fallback format too). */
function extractCategories(txt: string): string[] {
  const found = new Set<string>();
  const add = (k: string) => found.add(k.toLowerCase());

  const lines = txt.split(/\n+/);

  for (const ln of lines) {
    // bullet lines like "- Top: ..." or "Top — ...", etc.
    const m = ln.match(/^\s*[-•]?\s*(Top|Bottom|Outerwear|Coat|Jacket|Dress|Shoes?|Bag|Knit|Denim)\b/i);
    if (m) add(m[1].toLowerCase());
  }

  // Also scan free text
  const lower = txt.toLowerCase();
  if (/\btrench\b|\bcoat\b/.test(lower)) add("outerwear");
  if (/\bjacket\b/.test(lower)) add("outerwear");
  if (/\bknit\b|\bsweater\b|\bcardigan\b/.test(lower)) add("knit");
  if (/\bdenim\b|\tjeans\b/.test(lower)) add("bottom");
  if (/\bdress\b/.test(lower)) add("dress");
  if (/\bshoes?\b|\bsneakers?\b|\bheels?\b|\bboots?\b/.test(lower)) add("shoes");
  if (/\bbag\b|\btote\b|\bshoulder bag\b|\bcrossbody\b/.test(lower)) add("bag");
  if (/\btop\b|\bblouse\b|\bshirt\b|\bturtleneck\b/.test(lower)) add("top");
  if (/\bbottom\b|\btrousers?\b|\bpants?\b|\bskirt\b/.test(lower)) add("bottom");
  if (/\bouterwear\b/.test(lower)) add("outerwear");

  // Normalize synonyms
  const norm = new Set<string>();
  for (const c of found) {
    if (c === "jacket" || c === "coat") norm.add("outerwear");
    else if (c === "shoe") norm.add("shoes");
    else norm.add(c);
  }

  // Only keep the main buckets we support for now
  const supported = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "knit"];
  return supported.filter((k) => norm.has(k));
}

async function fetchCategory(
  category: string,
  hint: string,
  prefs?: Prefs,
  country?: string
): Promise<Product[]> {
  const q = `${category} ${hint}`.trim();
  const res = await fetch("/api/products/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: q,
      perProvider: 4,
      limit: 12,
      country: country ?? "NL",
      prefs,
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { ok?: boolean; items?: Product[] };
  return data?.ok && Array.isArray(data.items) ? data.items : [];
}

export function ProductSuggestions({ messages, prefs, country }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<Suggestions>({});
  const [lastHash, setLastHash] = React.useState<string>("");

  React.useEffect(() => {
    const txt = lastAssistantText(messages);
    if (!txt) return;

    // Create a hash of last assistant text to avoid duplicate fetches
    const h = String(txt.length) + ":" + txt.slice(0, 200);
    if (h === lastHash) return;

    const cats = extractCategories(txt);
    if (!cats.length) {
      setResults({});
      setLastHash(h);
      return;
    }

    setLoading(true);
    Promise.all(
      cats.map(async (c) => {
        const hint =
          (prefs?.keywords && prefs.keywords[0]) ||
          (prefs?.bodyType ? `${prefs.bodyType}` : "") ||
          "";
        const items = await fetchCategory(c, hint, prefs, country);
        return [c, items] as const;
      })
    )
      .then((pairs) => {
        const map: Suggestions = {};
        for (const [k, items] of pairs) map[k] = items;
        setResults(map);
      })
      .finally(() => {
        setLoading(false);
        setLastHash(h);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const catOrder = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "knit"].filter(
    (k) => results[k]?.length
  );

  if (loading && !catOrder.length) {
    // initial skeleton
    return (
      <section className="mt-6 grid gap-4">
        <header>
          <h2 className="text-lg font-semibold">Suggested pieces</h2>
          <p className="text-sm text-gray-600">Pulling options that match your look…</p>
        </header>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!catOrder.length) return null;

  return (
    <section className="mt-6 grid gap-6">
      <header>
        <h2 className="text-lg font-semibold">Suggested pieces</h2>
        <p className="text-sm text-gray-600">
          Curated from your latest outfit plan. Links may include affiliate parameters.
        </p>
      </header>

      {catOrder.map((cat) => {
        const items = results[cat]!;
        return (
          <div key={cat} className="grid gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">{cat}</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={`${cat}-${p.id}-${p.url}`} item={p} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
