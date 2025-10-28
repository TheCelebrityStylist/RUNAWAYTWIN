// FILE: app/looks/loading.tsx
import * as React from "react";
import { ProductCardSkeleton } from "@/components/ProductCard";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
      <div className="mb-6">
        <div className="h-6 w-48 rounded bg-gray-100" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
