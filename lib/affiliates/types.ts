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

export type Currency = string;

export type Availability =
  | "in_stock"
  | "out_of_stock"
  | "preorder"
  | "unknown"
  | (string & {});

export type Product = {
  id: string;
  title: string;
  url: string;
  image?: string | null;
  price?: number | null;
  currency?: Currency | null;
  brand?: string | null;
  affiliate_url?: string | null;
  retailer?: string | null;
  availability?: Availability | null;
  category?: Category;

  // Structured metadata (kept optional to avoid breaking older providers)
  fit?: {
    category?: Category;
    reason?: string;
    tags?: string[];
    gender?: "female" | "male" | "unisex";
    sizes?: Array<string | number>;
  };

  attrs?: Record<string, unknown>;

  // Provenance
  source?: ProviderKey;
};

export type ProviderSearchOptions = {
  limit?: number;
  country?: string; // e.g. "NL"
  currency?: Currency;
  [key: string]: unknown;
};

export type ProviderSearchResult = {
  provider?: ProviderKey;
  items: Product[];
};

export type ProviderResult = ProviderSearchResult;

export type Provider = {
  key?: ProviderKey;
  search: (query: string, opts?: ProviderSearchOptions) => Promise<ProviderSearchResult>;
};
