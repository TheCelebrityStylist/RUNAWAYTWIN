export type Product = {
  id?: string;
  title: string;
  brand: string;
  retailer: string;
  price: number | null;
  currency: string | null;
  url: string;
  imageUrl?: string | null;
  category?: string | null;
  description?: string | null;
  color?: string | null;
  sizes?: string[];
  availability?: string | null;
  source?: string;
};

export type SearchProductsArgs = {
  query: string;
  url?: string;
  country?: string;
  currency?: string;
  budgetMax?: number;
  size?: string;
  color?: string;
  category?: string;
  limit?: number;
};

export type ProductSearchResult = {
  items: Product[];
  query: string;
  source: string;
  tookMs?: number;
  notes?: string;
};

export type CheckStockArgs = {
  productId?: string;
  url?: string;
  country?: string;
};

export type StockResult = {
  productId?: string;
  url?: string;
  inStock: boolean;
  price?: number | null;
  currency?: string | null;
  retailer?: string | null;
  sizeOptions?: string[];
  raw?: any;
};

export type AffiliateLinkArgs = {
  url: string;
  retailer?: string | null;
};

export type PaletteArgs = {
  imageUrl: string;
  swatches?: number;
};

export type PaletteResult = {
  colors: string[];
  source: string;
};

export type FxArgs = {
  amount: number;
  from: string;
  to: string;
};

export type FxResult = {
  amount: number;
  rate: number;
  currency: string;
  source: string;
};

export type AdapterContext = {
  preferences?: any;
};

export interface ProductAdapter {
  name: string;
  searchProducts?(args: SearchProductsArgs, ctx: AdapterContext): Promise<ProductSearchResult | null>;
  checkStock?(args: CheckStockArgs, ctx: AdapterContext): Promise<StockResult | null>;
  affiliateLink?(args: AffiliateLinkArgs, ctx: AdapterContext): Promise<{ url: string; retailer?: string | null } | null>;
}
