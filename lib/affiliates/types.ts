// FILE: lib/affiliates/types.ts
// Shared affiliate/provider types (strict-safe)

export type ProviderKey = "web" | "amazon" | "rakuten" | "awin";

export type Category =
  | "Top"
  | "Bottom"
  | "Dress"
  | "Outerwear"
  | "Shoes"
  | "Bag"
  | "Accessory";

export type Product = {
  id: string;
  title: string;
  url: string;
  image: string | null;
  price: number | null;
  currency: string | null;
  brand: string | null;

  // Structured metadata (kept optional to avoid breaking older providers)
  fit?: {
    category?: Category;
    reason?: string;
    tags?: string[];
  };

  // Provenance
  source: ProviderKey;
};

export type ProviderSearchOptions = {
  limit: number;
  country?: string; // e.g. "NL"
};

export type ProviderSearchResult = {
  items: Product[];
};

export type Provider = {
  key: ProviderKey;
  search: (query: string, opts: ProviderSearchOptions) => Promise<ProviderSearchResult>;
};
