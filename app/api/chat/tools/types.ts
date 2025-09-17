// FILE: app/api/chat/tools/types.ts
export type Product = {
  id: string;
  brand: string;
  title: string;
  price: number | null;
  currency: string | null;
  retailer: string | null;
  url: string;
  imageUrl?: string | null;
  availability?: string | null;
};

export type SearchParams = {
  query: string;
  country?: string;
  currency?: string;
  size?: string | null;
  color?: string | null;
  limit?: number;
};

export interface ProductAdapter {
  name: string;
  searchProducts(params: SearchParams): Promise<Product[]>;
  checkStock?(productIdOrUrl: string, country?: string): Promise<{ availability: string | null }>;
  affiliateLink?(url: string, retailer?: string | null): Promise<string>;
}
