// FILE: components/FavButton.tsx
"use client";

import * as React from "react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import type { Product } from "@/lib/affiliates/types";

type Props = {
  product: Product;
  className?: string;
  size?: "sm" | "md";
};

export default function FavButton({ product, className = "", size = "md" }: Props) {
  const { toggle, has } = useFavorites();
  const saved = has(product);

  const pad = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm";
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      className={`inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white ${pad} font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60 ${className}`}
    >
      <span aria-hidden className={saved ? "text-red-600" : "text-gray-500"}>
        {saved ? "♥" : "♡"}
      </span>
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
