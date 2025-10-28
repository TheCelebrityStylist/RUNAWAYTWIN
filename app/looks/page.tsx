// FILE: app/looks/page.tsx
"use client";

import * as React from "react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { ProductCard } from "@/components/ProductCard";
import { encodeProductsToCode, decodeProductsFromCode, downloadJson } from "@/lib/share";

export default function LooksPage() {
  const { list, clear } = useFavorites();
  const [importText, setImportText] = React.useState<string>("");

  const shareLink = React.useMemo(() => {
    if (!list.length) return "";
    const code = encodeProductsToCode(list);
    return `${location.origin}/lookshare/${code}`;
  }, [list]);

  const onCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      alert("Share link copied ✅");
    } catch {
      // fallback
      prompt("Copy this link", shareLink);
    }
  };

  const onExportJson = () => {
    downloadJson("runwaytwin-look.json", list);
  };

  const onImport = () => {
    const trimmed = importText.trim();
    if (!trimmed) return;
    const items = decodeProductsFromCode(trimmed);
    if (!items.length) {
      alert("Import failed. Check the code and try again.");
      return;
    }
    // store into localStorage favorites key format used by useFavorites
    try {
      const KEY = "rwt-favorites-v1";
      const map: Record<string, any> = {};
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6 grid gap-2 sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Lookboard</h1>
          <p className="text-sm text-gray-600">
            Save items you love. Share your board with a link or export/import as JSON.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCopy}
            disabled={!list.length}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Copy share link
          </button>
          <button
            onClick={onExportJson}
            disabled={!list.length}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
          >
            Export JSON
          </button>
          {list.length > 0 && (
            <button
              onClick={clear}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

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
