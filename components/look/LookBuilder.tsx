// components/look/LookBuilder.tsx
"use client";

import React, { useMemo } from "react";

/**
 * Forgiving parser for the “Outfit” section the stylist outputs.
 * Works without named regex groups (ES2018 not required).
 *
 * Expected line shape (flexible):
 * - Top — BRAND Item (€120, Retailer) · [https://...]
 * - Dress — BRAND Item ($240, NET-A-PORTER) · https://...
 * - Shoes — BRAND Item (€150) · (https://...)
 *
 * Strategy:
 *  1) Only consider bullet lines that contain an em dash "—".
 *  2) category  = text before "—"
 *  3) brandItem = between "—" and first "(" (if any), else to " · " or line end
 *  4) details   = first (...) pair -> split by "," -> price, retailer
 *  5) link      = first http(s):// URL anywhere in the line
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

  // Prefer Outfit section when present
  const parts = text.split(/(?:^|\n)Outfit\s*:?\s*/i);
  const outfitBlock = parts.length > 1 ? parts.slice(1).join("\n") : text;
  const lines = outfitBlock.split(/\r?\n/);

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!/^[•\-]/.test(line)) continue;         // must start with a bullet
    if (!line.includes("—")) continue;          // must have an em dash

    // 1) Category
    const dashIdx = line.indexOf("—");
    const category = line.slice(1, dashIdx).replace(/[•\-]/, "").trim();
    if (!category) continue;

    // 2) brandItem (between "—" and first "(" or " · ")
    const afterDash = line.slice(dashIdx + 1).trim();
    const parenIdx = afterDash.indexOf("(");
    const dotIdx = afterDash.indexOf("·");
    let brandItem = "";
    if (parenIdx !== -1) {
      brandItem = afterDash.slice(0, parenIdx).trim().replace(/[–-]\s*$/,"");
    } else if (dotIdx !== -1) {
      brandItem = afterDash.slice(0, dotIdx).trim();
    } else {
      brandItem = afterDash.trim();
    }
    brandItem = brandItem.replace(/\s+$/,"");

    // 3) details in first (...) -> price, retailer
    let price: string | undefined;
    let retailer: string | undefined;
    const firstParenStart = afterDash.indexOf("(");
    if (firstParenStart !== -1) {
      // find matching )
      const afterParen = afterDash.slice(firstParenStart + 1);
      const close = afterParen.indexOf(")");
      if (close !== -1) {
        const inside = afterParen.slice(0, close).trim();
        if (inside) {
          const parts = inside.split(",").map((s) => s.trim()).filter(Boolean);
          if (parts.length === 1) {
            // Could be price OR retailer
            if (/[\d€$£]|USD|EUR|GBP/i.test(parts[0])) price = parts[0];
            else retailer = parts[0];
          } else if (parts.length >= 2) {
            price = parts[0];
            retailer = parts.slice(1).join(", "); // keep commas in retailer names
          }
        }
      }
    }

    // 4) URL anywhere
    const urlMatch = line.match(/https?:\/\/[^\s\])>]+/);
    const link = urlMatch ? urlMatch[0] : undefined;

    items.push({ category, brandItem, price, retailer, link });
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
            {/* Placeholder image block – swap to real product images when tools return imageUrl */}
            <div
              className="aspect-[4/5] w-full rounded-2xl border mb-3 bg-[var(--rt-ivory)]"
              style={{ borderColor: "var(--rt-border)" }}
            />
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
