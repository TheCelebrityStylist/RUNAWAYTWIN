/* Small SEO helpers: titles under 60 characters, descriptions under 155, shared JSON-LD pieces. */

export const BASE = "https://runwaytwin.com";
const SUFFIX = " | RunwayTwin";

/** First candidate that fits in `max` characters with the brand suffix, then without it, else a hard cut. */
export function fitTitle(candidates: string[], max = 60) {
  for (const c of candidates) if ((c + SUFFIX).length <= max) return c + SUFFIX;
  for (const c of candidates) if (c.length <= max) return c;
  const last = candidates[candidates.length - 1];
  return last.slice(0, max - 1).replace(/[\s,:;&-]+\S*$/, "") + "…";
}

/** Cut a description at a word boundary so it stays under `max` characters. */
export function clip(text: string, max = 155) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const sentences = t.slice(0, max).match(/^.*[.!?](?=\s|$)/);
  if (sentences && sentences[0].length >= 100) return sentences[0];
  const cut = t.slice(0, max - 1).replace(/[\s,:;(—-]+\S*$/, "");
  return cut.replace(/[.,;:]$/, "") + "…";
}

export const breadcrumbLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
});

export const ORG_REF = { "@type": "Organization", "@id": `${BASE}/#organization`, name: "RunwayTwin", url: BASE };

/** Product + Offer for a real, checked shop link with a price. */
export function productLd(p: { url: string; title: string; brand?: string; shop?: string; price_eur?: number | null; image?: string; tier?: string }) {
  return {
    "@type": "Product",
    name: p.title,
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.image ? { image: p.image } : {}),
    offers: {
      "@type": "Offer",
      url: p.url,
      price: Number(p.price_eur).toFixed(2),
      priceCurrency: "EUR",
      itemCondition: p.tier === "preloved" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
      ...(p.shop ? { seller: { "@type": "Organization", name: p.shop } } : {}),
    },
  };
}
