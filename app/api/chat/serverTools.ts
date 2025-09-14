import * as cheerio from "cheerio";

export async function web_search({ query, num = 5 }: {query: string; num?: number}) {
  // Example using SerpAPI; swap to Bing/Brave easily.
  const r = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${num}&api_key=${process.env.SERPAPI_KEY}`);
  const j = await r.json();
  const results = (j.organic_results || []).map((o: any) => ({
    title: o.title, link: o.link, snippet: o.snippet
  }));
  return { results };
}

export async function open_url_extract({ url }: { url: string }) {
  const res = await fetch(url, { headers: { "user-agent": "RunwayTwinBot/1.0" }});
  const html = await res.text();
  const $ = cheerio.load(html);
  const title = $("title").first().text() || $("h1").first().text();
  const text = $("p").map((_, el) => $(el).text()).get().join("\n").replace(/\s+\n/g, "\n");
  const canonical = $('link[rel="canonical"]').attr("href") || url;
  return { title, text: text.slice(0, 8000), canonical };
}

// Stub for later affiliate catalog integrations:
export async function catalog_search(args: {
  query: string; region?: "EU"|"US"; budget?: string; sizes?: Record<string, string>; limit?: number;
}) {
  // For now, return empty but well-formed list.
  // When you have keys: call Awin/Impact APIs, normalize {title, brand, price, currency, url, image, retailer, sizes}
  return { products: [] as Array<any> };
}
