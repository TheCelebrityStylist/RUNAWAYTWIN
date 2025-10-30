// FILE: app/looks/page.tsx
"use client";

import * as React from "react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { ProductCard } from "@/components/ProductCard";
import {
  encodeProductsToCode,
  decodeProductsFromCode,
  downloadJson,
} from "@/lib/share";
import type { Product } from "@/lib/affiliates/types";
import type { Prefs } from "@/lib/types";

/* ---------- tiny safe readers (no reliance on typed keys on unknown) ---------- */
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function getStr(o: unknown, k: string, def = ""): string {
  return isObj(o) && typeof o[k] === "string" ? (o[k] as string) : def;
}
function getNumOrNull(o: unknown, k: string): number | null {
  return isObj(o) && typeof o[k] === "number" && Number.isFinite(o[k] as number)
    ? (o[k] as number)
    : null;
}

/** Normalize any favorite-like object into a strict `Product` */
function toProduct(fav: unknown): Product {
  const title = getStr(fav, "title", "Item");
  const id =
    getStr(fav, "id") || getStr(fav, "url") || `${title}-${crypto.randomUUID()}`;

  const url = getStr(fav, "url", "");
  const brand = getStr(fav, "brand", "");
  // category may exist in some sources, but it's NOT part of Product → do not include in return
  // const category = getStr(fav, "category", "Accessory");
  const priceRaw = getNumOrNull(fav, "price");
  const price = priceRaw ?? undefined; // Product.price is number | undefined
  const currency = getStr(fav, "currency", "EUR");
  const image = getStr(fav, "image", "");
  const retailer = getStr(fav, "retailer", "");

  // IMPORTANT: only fields that exist on Product
  return { id, title, url, brand, price, currency, image, retailer };
}

export default function LooksPage() {
  const { list, clear } = useFavorites();
  const [importText, setImportText] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [building, setBuilding] = React.useState(false);
  const [plan, setPlan] = React.useState<string>("");

  // Optional: hydrate prefs from localStorage
  const [prefs, setPrefs] = React.useState<Prefs | undefined>(undefined);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("rwt-prefs");
      if (raw) setPrefs(JSON.parse(raw) as Prefs);
    } catch {
      /* ignore */
    }
  }, []);

  // Strict, normalized products
  const products: Product[] = React.useMemo(() => list.map((x) => toProduct(x)), [list]);

  const shareLink = React.useMemo(() => {
    if (!products.length) return "";
    const code = encodeProductsToCode(products);
    return `${location.origin}/lookshare/${code}`;
  }, [products]);

  const onCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      alert("Share link copied ✅");
    } catch {
      prompt("Copy this link", shareLink);
    }
  };

  const onExportJson = () => {
    downloadJson("runwaytwin-look.json", products);
  };

  const onImport = () => {
    const trimmed = importText.trim();
    if (!trimmed) return;
    const items = decodeProductsFromCode(trimmed); // Product[]
    if (!items.length) {
      alert("Import failed. Check the code and try again.");
      return;
    }
    try {
      const KEY = "rwt-favorites-v1";
      const map: Record<string, Product> = {};
      for (const p of items) {
        const key = p.url || p.id || p.title;
        map[key] = p;
      }
      localStorage.setItem(KEY, JSON.stringify(map));
      location.reload();
    } catch {
      alert("Could not save imported items.");
    }
  };

  const onBuild = async () => {
    if (!products.length) {
      alert("Add a few items to your board first.");
      return;
    }
    setBuilding(true);
    setPlan("");
    try {
      const res = await fetch("/api/look/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: products.map((p) => ({
            id: p.id,
            title: p.title,
            brand: p.brand,
            price: p.price,
            currency: p.currency,
            image: p.image,
            url: p.url,
            retailer: p.retailer,
          })),
          prefs,
          note,
        }),
      });
      const txt = await res.text();
      setPlan(txt);
    } catch (e) {
      setPlan(String((e as Error).message || e));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6 grid gap-2 sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Lookboard</h1>
          <p className="text-sm text-gray-600">
            Save items you love. Share, export/import, and build an AI-styled outfit from this
            board.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCopy}
            disabled={!products.length}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Copy share link
          </button>
          <button
            onClick={onExportJson}
            disabled={!products.length}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Export JSON
          </button>
          {products.length > 0 && (
            <button
              onClick={clear}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      {/* Build outfit */}
      <section className="mb-8 grid gap-2 rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Build an Outfit from this Board</h2>
        <label htmlFor="note" className="text-sm text-gray-700">
          Optional note (occasion, vibe, constraints)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., Smart-casual dinner in Paris, prefer flats, rainy weather."
          className="min-h-[64px] rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={onBuild}
            disabled={building || !products.length}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            {building ? "Styling…" : "Build Outfit"}
          </button>
          {building && (
            <span className="text-sm text-gray-600">Composing look…</span>
          )}
        </div>
        {plan && (
          <pre className="whitespace-pre-wrap rounded-xl border bg-gray-50 p-3 text-sm">
            {plan}
          </pre>
        )}
      </section>

      {/* Import */}
      <section className="mb-10">
        <label htmlFor="import" className="mb-1 block text-sm font-medium text-gray-700">
          Import from share code
        </label>
        <div className="flex gap-2">
          <input
            id="import"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste share code here (the part after /lookshare/...)"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none ring-0 focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-black/60"
          />
          <button
            onClick={onImport}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Import
          </button>
        </div>
      </section>

      {/* Grid */}
      {products.length === 0 ? (
        <p className="text-sm text-gray-600">
          You haven’t saved anything yet. Click the ❤️ icon on any product to add it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} item={p} />
          ))}
        </div>
      )}
    </main>
  );
}

