// FILE: app/products/page.tsx
"use client";

import * as React from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import type { Product } from "@/lib/affiliates/types";

type ApiResponse =
  | { ok: true; items: Product[]; count: number; query: string }
  | { error: string };

export default function ProductsPage() {
  const [query, setQuery] = React.useState<string>("black blazer");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<Product[]>([]);

  const controllerRef = React.useRef<AbortController | null>(null);

  const search = React.useCallback(async (q: string) => {
    if (!q.trim()) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          query: q.trim(),
          perProvider: 4,
          limit: 24,
          country: "NL",
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as ApiResponse;
      if ("error" in data) throw new Error(data.error);

      setItems(data.items);
    } catch (err) {
      if ((err as any)?.name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // initial search
    void search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search(query);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6 grid gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Product Finder (demo)</h1>
        <p className="text-sm text-gray-600">
          Searches mock providers (Amazon / Rakuten / Awin) and merges results. Works without API
          keys. Links may include affiliate params if configured.
        </p>

        <form onSubmit={onSubmit} className="flex gap-2" role="search" aria-label="Product search">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., black blazer, white sneakers, trench coat"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2 outline-none ring-0 focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
            aria-label="Search products"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Search
          </button>
        </form>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}
      </header>

      {/* Grid */}
      <section aria-busy={loading} aria-live="polite">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={`${p.id}-${p.url}`} item={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No products found. Try another query.</p>
        )}
      </section>
    </main>
  );
}
