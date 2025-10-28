// FILE: app/looks/page.tsx
"use client";

import * as React from "react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { ProductCard } from "@/components/ProductCard";

export default function LooksPage() {
  const { list, clear } = useFavorites();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Lookboard</h1>
          <p className="text-sm text-gray-600">
            Your saved favorites — stored locally, no account needed.
          </p>
        </div>
        {list.length > 0 && (
          <button
            onClick={clear}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Clear all
          </button>
        )}
      </header>

      {list.length === 0 ? (
        <p className="text-sm text-gray-600">
          You haven’t saved anything yet. Click the ❤️ icon on any product to add it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={`${p.id}-${p.url}`} item={p} />
          ))}
        </div>
      )}
    </main>
  );
}
