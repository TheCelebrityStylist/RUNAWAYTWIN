// FILE: app/lookshare/[code]/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { decodeProductsFromCode } from "@/lib/share";
import type { Product } from "@/lib/affiliates/types";

export default function LookSharePage({
  params,
}: {
  params: { code: string };
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<Product[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    try {
      const decoded = decodeProductsFromCode(params.code);
      if (!decoded?.length) {
        setError("Invalid or expired share code.");
      } else {
        setItems(decoded);
      }
    } catch (e) {
      setError("Could not decode this link.");
    }
  }, [params.code]);

  const onImport = () => {
    if (!items.length) return;
    try {
      setImporting(true);
      const KEY = "rwt-favorites-v1";
      const map: Record<string, Product> = {};
      for (const p of items) {
        const key = p.url || p.id || p.title;
        map[key] = p;
      }
      localStorage.setItem(KEY, JSON.stringify(map));
      alert("Imported successfully ✅ — redirecting to your Lookboard");
      router.push("/looks");
    } catch {
      alert("Could not import items. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this link:", window.location.href);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-gray-700">
        <p>{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-3 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Back Home
        </button>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-gray-700">
        <p>Loading shared look…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
      <header className="mb-6 grid gap-2 sm:flex sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Shared Lookboard
          </h1>
          <p className="text-sm text-gray-600">
            {items.length} product{items.length > 1 ? "s" : ""} curated by
            another RunwayTwin user.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onImport}
            disabled={importing}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import to My Board"}
          </button>
          <button
            onClick={onCopy}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </header>

      <section
        aria-label="Shared products"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        {items.map((p) => (
          <ProductCard key={`${p.id}-${p.url}`} item={p} />
        ))}
      </section>
    </main>
  );
}
