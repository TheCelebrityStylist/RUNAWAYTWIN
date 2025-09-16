// components/look/LookBuilder.tsx
"use client";

import React, { useMemo } from "react";
import { parseOutfit, OutfitItem } from "@/lib/look/parseOutfit";

function ProductCard({ item }: { item: OutfitItem }) {
  const { category, brandItem, price, retailer, link, image } = item;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
    >
      <div
        className="aspect-[4/5] w-full overflow-hidden rounded-2xl border mb-3 bg-[var(--rt-ivory)]"
        style={{ borderColor: "var(--rt-border)" }}
      >
        {image ? (
          <img
            src={image}
            alt={brandItem}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-[var(--rt-muted)]">
            Image coming soon
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-[12px] uppercase tracking-wide" style={{ color: "var(--rt-muted)" }}>
          {category}
        </div>
        <div className="text-[14px] font-medium leading-snug">{brandItem}</div>
        <div className="text-[13px]" style={{ color: "var(--rt-charcoal)" }}>
          {price ? price : ""}{price && retailer ? " — " : ""}{retailer || ""}
        </div>
      </div>
    </a>
  );
}

export default function LookBuilder({ text }: { text: string }) {
  const items = useMemo(() => parseOutfit(text), [text]);

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
        {items.map((item, index) => (
          <ProductCard key={`${item.category}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}
