// FILE: app/api/chat/tools/types.ts
/**
 * Shared types for the product tool adapters.
 * These are strict enough for TS --strict while remaining adapter-friendly.
 */

export type Product = {
  id: string;                 // sku, productId, or canonical URL
  brand: string;              // Brand name (e.g., "The Row")
  title: string;              // Exact item title (e.g., "Wesler Merino T-Shirt")
  price: number | null;       // Numeric price (no currency symbols)
  currency: string | null;    // ISO 4217 ("EUR", "USD", ...)
  retailer: string | null;    // Retailer or marketplace (e.g., "Matches", "SSENSE")
  url: string;                // Canonical PDP URL (no tracking)
  imageUrl?: string | null;   // Primary image URL (if available)
  availability?: string | null; // e.g., "InStock", "OutOfStock"
};

export type SearchProductsArgs = {
  query: string;
  country?: string;
  currency?: string;
  size?: string | null;
  color?: string | null;
  limit?: number;
  preferEU?: boolean;
};

export interface ProductAdapter {
  name: string;
  searchProducts(params: SearchProductsArgs): Promise<Product[]>;
  checkStock?(productIdOrUrl: string, country?: string): Promise<{ availability: string | null }>;
  affiliateLink?(url: string, retailer?: string | null): Promise<string>;
}
