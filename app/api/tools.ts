import { searchProducts as advancedSearchProducts, fxConvert as advancedFxConvert } from "./chat/tools";
import type { AdapterContext, Product, SearchProductsArgs, FxArgs, FxResult } from "./chat/tools/types";

export type { Product } from "./chat/tools/types";

export type LegacySearchArgs = {
  query: string;
  country?: string;
  currency?: string;
  limit?: number;
  preferEU?: boolean;
  budget?: number;
  budgetMax?: number;
  size?: string;
  color?: string;
  category?: string;
};

function buildContext(args: LegacySearchArgs): AdapterContext {
  return {
    preferences: {
      country: args.country,
      currency: args.currency,
    },
  };
}

function mapSearchArgs(args: LegacySearchArgs): SearchProductsArgs {
  const { query, country, currency, limit, budget, budgetMax, size, color, category } = args;
  return {
    query,
    country,
    currency,
    limit,
    budgetMax: typeof budgetMax === "number" ? budgetMax : typeof budget === "number" ? budget : undefined,
    size,
    color,
    category,
  };
}

export async function searchProducts(args: LegacySearchArgs): Promise<Product[]> {
  const mapped = mapSearchArgs(args);
  const ctx = buildContext(args);
  const result = await advancedSearchProducts(mapped, ctx);
  return Array.isArray(result?.items) ? result!.items : [];
}

export async function fxConvert(args: FxArgs): Promise<FxResult> {
  return advancedFxConvert(args);
}
