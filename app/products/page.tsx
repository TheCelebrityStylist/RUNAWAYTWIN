// FILE: app/products/page.tsx
"use client";

import * as React from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import type { Product } from "@/lib/affiliates/types";

type ApiResponse =
  | { ok: true; items: Product[]; count: number; query: string }
  | { error: string };

type ProvidersState = {
  amazon: boolean;
  rakuten: boolean;
  awin: boolean;
};

export default function ProductsPage() {
  const [query, setQuery] = React.useState<string>("black blazer");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<Product[]>([]);
  const [providers, setProviders] = React.useState<ProvidersState>({
    amazon: true,
    rakuten: true,
    awin: true,
  });
  const [priceMin, setPriceMin] = React.useState<string>("");
  const [priceMax, setPriceMax] = React.useState<string>("");

  const controllerRef = React.useRef<AbortController | null>(null);

  const search = React.useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const enabledProviders = (Object.keys(providers) as Array<keyof ProvidersState>)
        .filter((k) => providers[k])
        .map((k) => k as "amazon" | "rakuten" | "awin");

      const body: Record<string, unknown> = {
        query: q,
        perProvider: 4,
        limit: 24,
        country: "NL",
        providers: enabledProviders,
      };

      const minNum = Number(priceMin);
      if (!Number.isNaN(minNum) && priceMin !== "") body.priceMin = minNum;

      const maxNum = Number(priceMax);
      if (!Number.isNaN(maxNum) && priceMax !== "") body.priceMax = maxNum;

      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as ApiResponse;
      if ("error" in data) throw new Error(data.error);

      setItems(data.items);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, providers, priceMin, priceMax]);

  React.useEffect(() => {
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6 grid gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Product Finder (demo)</h1>
        <p className="text-sm text-gray-600">
          Filter by provider and price; results are merged and ranked. Works in mock mode without
          any keys.
        </p>

        <form onSubmit={onSubmit} className="grid gap-3" role="search" aria-label="Product search">
          <div className="flex gap-2">
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
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Providers */}
            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="sr-only">Providers</legend>
              {(["amazon", "rakuten", "awin"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={providers[key]}
                    onChange={(e) =>
                      setProviders((p) => ({ ...p, [key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black/60"
                  />
                  <span className="capitalize">{key}</span>
                </label>
              ))}
            </fieldset>

            {/* Price range */}
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="min" className="text-gray-600">
                Min
              </label>
              <input
                id="min"
                inputMode="numeric"
                pattern="[0-9]*"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="€"
                className="w-24 rounded-md border px-2 py-1 text-sm focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
              />
              <label htmlFor="max" className="text-gray-600">
                Max
              </label>
              <input
                id="max"
                inputMode="numeric"
                pattern="[0-9]*"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="€"
                className="w-24 rounded-md border px-2 py-1 text-sm focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
              />
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </div>
          ) : null}
        </form>
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
          <p className="text-sm text-gray-600">No products found. Adjust filters and try again.</p>
        )}
      </section>
    </main>
  );
}
