// FILE: app/lookshare/[code]/page.tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { decodeProductsFromCode } from "@/lib/share";
import type { Product } from "@/lib/affiliates/types";
import { ProductCard } from "@/components/ProductCard";

export default function LookSharePage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  const [items, setItems] = React.useState<Product[] | null>(null);

  React.useEffect(() => {
    const list = typeof code === "string" ? decodeProductsFromCode(code) : [];
    setItems(list);
  }, [code]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Shared Lookboard</h1>
        <p className="text-sm text-gray-600">View-only board generated from a share link.</p>
      </header>

      {items === null ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600">Invalid or empty share code.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <ProductCard key={`${i}-${p.url}`} item={p} />
          ))}
        </div>
      )}
    </main>
  );
}
