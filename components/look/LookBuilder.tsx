// components/look/LookBuilder.tsx
"use client";

import React, { useMemo } from "react";

/**
 * Very forgiving parser that looks for the "Outfit" section and extracts lines like:
 * "- Top — BRAND Item (€120, Retailer) · [Link]"
 * It works with the stylist format we enforced in systemPrompt.
 */
function parseItems(text: string) {
  const items: {
    category: string;
    brandItem: string;
    price?: string;
    retailer?: string;
    link?: string;
  }[] = [];

  if (!text) return items;

  // Try to isolate the Outfit section first
  const outfitMatch = text.split(/(?:^|\n)Outfit\s*:\s*/i).pop() || text;
  const lines = outfitMatch.split("\n");

  const re =
    /^\s*[-•]\s*(?<cat>[A-Za-z /&]+)\s+—\s+(?<brandItem>.+?)\s*\((?<price>[^,()]+)?(?:,\s*(?<retailer>[^()]+))?\)\s*·\s*\[(?<link>https?:\/\/[^\]]+)\]/;

  for (const raw of lines) {
    const m = raw.match(re);
    if (m?.groups) {
      items.push({
        category: m.groups.cat.trim(),
        brandItem: m.groups.brandItem.trim(),
        price: m.groups.price?.trim(),
        retailer: m.groups.retailer?.trim(),
        link: m.groups.link?.trim(),
      });
    }
  }
  return items;
}

export default function LookBuilder({ text }: { text: string }) {
  const items = useMemo(() => parseItems(text), [text]);

  if (!items.length) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-[15px]">Your Look</h3>
        <p className="text-[13px] mt-1" style={{ color: "var(--rt-charcoal)" }}>
          I’ll populate this section as soon as I recommend specific items with links.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-[15px] mb-3">Your Look</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {items.map((it, i) => (
          <a
            key={i}
            href={it.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <div className="aspect-[4/5] w-full rounded-2xl border mb-3 bg-[var(--rt-ivory)]"
                 style={{ borderColor: "var(--rt-border)" }} />
            <div className="space-y-1">
              <div className="text-[12px] uppercase tracking-wide" style={{ color: "var(--rt-muted)" }}>
                {it.category}
              </div>
              <div className="text-[14px] font-medium leading-snug">
                {it.brandItem}
              </div>
              <div className="text-[13px]" style={{ color: "var(--rt-charcoal)" }}>
                {it.price ? it.price : ""}{it.price && it.retailer ? " — " : ""}{it.retailer ? it.retailer : ""}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
