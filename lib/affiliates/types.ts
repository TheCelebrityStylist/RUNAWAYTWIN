// FILE: lib/affiliates/types.ts
export type Currency = "EUR" | "USD" | "GBP" | string;

export type ProductID = string;

export type Product = {
  id: ProductID;
  title: string;
  brand?: string;
  retailer?: string; // e.g., "amazon", "rakuten", "awin:Zara", "web:Zara"
  url: string; // raw product URL (wrapped at response)
  image?: string;
  price?: number;
  currency?: Currency;
  availability?: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  // Optional fit metadata for stylist ranking
  fit?: {
    gender?: "female" | "male" | "unisex";
    category?: string; // "top", "bottom", "dress", "outerwear", "shoes", etc.
    sizes?: string[]; // available sizes
    color?: string;
  };
  // Free-form attributes for provider-specific details
  attrs?: Record<string, string | number | boolean | null | undefined>;
};

export type ProviderResult = {
  provider: "amazon" | "rakuten" | "awin" | "web";
  items: Product[];
};

/** Useful union for request validation and UI toggles */
export type ProviderKey = ProviderResult["provider"];

export interface Provider {
  search: (q: string, opts?: { limit?: number; currency?: Currency }) => Promise<ProviderResult>;
}
