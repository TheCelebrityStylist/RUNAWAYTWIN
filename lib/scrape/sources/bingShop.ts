// FILE: lib/scrape/sources/bingShop.ts
// NOTE: We intentionally implement a "Bing Shop"-named source as a thin wrapper.
// Your previous build error referenced this module path; adding it makes builds reliable.
// Many hosts block direct Bing/Google scraping. DuckDuckGo shopping is often more accessible without keys.

import type { ScrapedProduct } from "./duckduckgoShopping";
import { searchDuckDuckGoShopping } from "./duckduckgoShopping";

export async function searchBingShop(query: string, limit = 12): Promise<ScrapedProduct[]> {
  // Keep the function name stable for imports, even if the backing source changes.
  return searchDuckDuckGoShopping(query, limit);
}
