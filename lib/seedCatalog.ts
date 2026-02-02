// FILE: lib/seedCatalog.ts
import seed from "@/lib/seedCatalog.json";

export type SeedItem = {
  id: string;
  title: string;
  brand: string;
  slot: "anchor" | "top" | "bottom" | "dress" | "shoe" | "accessory";
  category: string;
  region: string;
  price: number;
  currency: "EUR" | "USD" | "GBP";
  url: string;
  image: string;
  tags: string[];
};

export const SEED_CATALOG = seed as SeedItem[];

export function searchSeedCatalog(opts: {
  slot: SeedItem["slot"];
  region: string;
  maxPrice: number;
  tags: string[];
}): SeedItem[] {
  const region = opts.region.toUpperCase();
  const tags = opts.tags.map((t) => t.toLowerCase());
  return SEED_CATALOG.filter((item) => {
    if (item.slot !== opts.slot) return false;
    if (region && item.region.toUpperCase() != region) return false;
    if (item.price > opts.maxPrice) return false;
    if (!tags.length) return true;
    return tags.some((t) => item.tags.map((x) => x.toLowerCase()).includes(t) || item.title.toLowerCase().includes(t));
  });
}
