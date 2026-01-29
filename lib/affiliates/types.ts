// FILE: lib/affiliates/types.ts
export type Provider = "amazon" | "rakuten" | "awin";
export type Currency = "EUR" | "USD" | "GBP" | string;

/**
 * Provider keys used across the codebase.
 *
 * - "web" is a real-product search provider (SerpAPI/Tavily fallback) that does not require affiliate programs.
 * - "amazon"/"rakuten"/"awin" are kept for future affiliate integrations and mock-mode demos.
 */
export type ProviderKey = Provider | "web";

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
  url: string | null;
  brand: string | null;
  category: Category;
  price: number | null;
  currency: Currency;
  image: string | null;
};

export type ProviderResult = {
  provider: ProviderKey;
  items: Product[];
};
