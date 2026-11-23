/* Drop Radar data: celebrity looks found and broken down daily by the RunwayTwin app (Base44).
   Public read only; the app writes them. Pages revalidate hourly. */

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://app.runwaytwin.com";
const APP_ID = "69b1ecd54f5ff3779a3069a6";

export type Tier = { brand?: string; price_eur?: number | null; match?: number; fit_note?: string; product?: string };
export type DropItem = {
  category: string;
  name: string;
  department?: string;
  color_name?: string;
  color_hex?: string;
  material?: string;
  details?: string;
  brand?: string;
  brand_confidence?: string;
  brand_evidence?: string;
  search_query?: string;
  visual_weight?: number;
  luxury?: Tier;
  mid?: Tier;
  high_street?: Tier;
};
export type Product = { url: string; title: string; brand?: string; shop?: string; price_eur?: number | null; image?: string; tier?: string; match?: number; verified?: boolean };
export type Drop = {
  id: string;
  slug: string;
  celebrity: string;
  event: string;
  look_date: string;
  summary?: string;
  sources?: { name: string; url: string }[];
  look_name?: string;
  vibe?: string;
  palette?: string[];
  styling_tips?: string[];
  items: DropItem[];
  totals?: { luxury?: number; mid?: number; high_street?: number };
  twin?: { score: number; cost: number; originals: number; min_cost?: number; min_score?: number } | null;
  published_at?: string;
  heat?: number;
  status?: string;
  products?: Record<string, Product[]>;
};

export async function getDrops(limit = 200): Promise<Drop[]> {
  try {
    const q = encodeURIComponent(JSON.stringify({ status: "ready" }));
    const r = await fetch(`${APP}/api/apps/${APP_ID}/entities/DropLook?q=${q}&sort=-published_at&limit=${limit}`, {
      next: { revalidate: 1800, tags: ["drops"] },
      headers: { accept: "application/json" },
    });
    if (!r.ok) return [];
    const rows = (await r.json()) as Drop[];
    return (Array.isArray(rows) ? rows : [])
      .filter((d) => d.status === "ready" && d.slug && d.items?.length)
      .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
  } catch {
    return [];
  }
}

export async function getDrop(slug: string): Promise<Drop | null> {
  const all = await getDrops();
  return all.find((d) => d.slug === slug) || null;
}

export const appLookHref = (slug: string) => `${APP}/OutfitBreakdown?drop=${encodeURIComponent(slug)}`;

const enc = encodeURIComponent;
/** Retailer search per tier, sent through /clk so affiliate tagging applies once configured. */
export function tierShopHref(item: DropItem, tier: "high_street" | "mid" | "luxury") {
  const t = item[tier] || {};
  const type = item.name.split(" ").slice(-2).join(" ");
  let u: string;
  if (tier === "luxury") {
    const dept = item.department === "men" ? "men" : "women";
    u = `https://www.farfetch.com/nl/shopping/${dept}/search/items.aspx?q=${enc(`${t.brand || item.brand || ""} ${type}`.trim())}`;
  } else if (tier === "mid") {
    u = `https://www.zalando.nl/catalogus/?q=${enc(item.search_query || item.name)}`;
  } else {
    u = `https://www.asos.com/nl/search/?q=${enc(item.search_query || item.name)}`;
  }
  return `/clk?u=${enc(u)}&rid=drop_${tier}`;
}

export const euro = (n?: number | null) => (n ? `€${Math.round(n).toLocaleString("en-IE")}` : "");
export const fmtDate = (d: string) => {
  try {
    return new Date(d + (d.length === 10 ? "T12:00:00Z" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
};
export const slugOfCeleb = (name: string) => name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Event hubs: looks grouped by occasion ("CFDA Fashion Awards, New York" + year). */
export type EventHub = { slug: string; name: string; year: string; looks: Drop[]; latest: string };
const eventKey = (d: Drop) => d.event.split(",")[0].replace(/\b(19|20)\d{2}\b/g, "").replace(/\s{2,}/g, " ").trim();
export async function getEvents(minLooks = 2): Promise<EventHub[]> {
  const all = await getDrops(500);
  const map = new Map<string, EventHub>();
  for (const d of all) {
    const name = eventKey(d);
    const year = (d.look_date || "").slice(0, 4);
    const slug = slugOfCeleb(`${name} ${year}`);
    const hub = map.get(slug) || { slug, name, year, looks: [], latest: d.published_at || "" };
    hub.looks.push(d);
    if ((d.published_at || "") > hub.latest) hub.latest = d.published_at || "";
    map.set(slug, hub);
  }
  return [...map.values()].filter((e) => e.looks.length >= minLooks).sort((a, b) => b.latest.localeCompare(a.latest));
}
export async function getEvent(slug: string) {
  return (await getEvents(1)).find((e) => e.slug === slug) || null;
}

/** The Dupe Index: how cheaply this week's celebrity looks can be recreated. Computed from Drop Radar data. */
export async function getDupeIndex() {
  const drops = (await getDrops(500)).filter((d) => d.twin && d.twin.originals > 0 && d.twin.cost > 0);
  const med = (xs: number[]) => {
    if (!xs.length) return 0;
    const a = [...xs].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const rows = drops.map((d) => ({
    slug: d.slug,
    celebrity: d.celebrity,
    event: d.event,
    date: d.look_date,
    score: d.twin!.score,
    cost: d.twin!.cost,
    originals: d.twin!.originals,
    share: d.twin!.cost / d.twin!.originals, // fraction of the original price
    pieces: d.items.length,
  }));
  const designers = new Map<string, number>();
  for (const d of drops) for (const i of d.items) if (i.brand && i.brand_confidence === "high") designers.set(i.brand, (designers.get(i.brand) || 0) + 1);
  // "Twin value": resemblance per % of price. Higher = easier to recreate for less.
  const value = (r: (typeof rows)[number]) => r.score / Math.max(0.5, r.share * 100);
  return {
    updated: drops[0]?.published_at || null,
    looks: rows.length,
    medianScore: Math.round(med(rows.map((r) => r.score))),
    medianShare: med(rows.map((r) => r.share)),
    medianCost: Math.round(med(rows.map((r) => r.cost))),
    medianOriginals: Math.round(med(rows.map((r) => r.originals))),
    easiest: [...rows].sort((a, b) => value(b) - value(a)).slice(0, 10),
    hardest: [...rows].sort((a, b) => a.score - b.score).slice(0, 5),
    designers: [...designers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, n]) => ({ name, looks: n })),
    rows,
  };
}

export const productHref = (p: Product) => `/clk?u=${encodeURIComponent(p.url)}&rid=drop_product_${p.tier || "x"}`;

/** Real, checked shop links with a price (only these go into Product structured data). */
export const shoppable = (list?: Product[]) => (list || []).filter((p) => p.verified && p.url && p.price_eur && p.price_eur > 0);

/** Celebrity hubs built from Drop Radar data: every celebrity with their looks, newest first. */
export type CelebHub = { slug: string; name: string; looks: Drop[]; latest: Drop };
export async function getCelebHubs(): Promise<CelebHub[]> {
  const map = new Map<string, CelebHub>();
  for (const d of await getDrops(500)) {
    const slug = slugOfCeleb(d.celebrity);
    const hub = map.get(slug);
    if (hub) hub.looks.push(d);
    else map.set(slug, { slug, name: d.celebrity, looks: [d], latest: d });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
}
/** A data hub page needs at least this many looks, so it says more than the look page itself. */
export const HUB_MIN_LOOKS = 2;
export async function getCelebHub(slug: string) {
  return (await getCelebHubs()).find((h) => h.slug === slug) || null;
}

/** Piece-type roundups ("celebrity coats", "celebrity shoes") grouped from item categories. */
export type PieceType = { slug: string; label: string; plural: string; keys: string[] };
export const PIECE_TYPES: PieceType[] = [
  { slug: "dresses", label: "Dresses", plural: "dresses", keys: ["dress", "gown"] },
  { slug: "coats-and-jackets", label: "Coats & jackets", plural: "coats and jackets", keys: ["outerwear", "coat", "jacket", "blazer"] },
  { slug: "tops", label: "Tops", plural: "tops", keys: ["top", "shirt", "blouse", "knitwear", "sweater"] },
  { slug: "trousers-and-skirts", label: "Trousers & skirts", plural: "trousers, skirts and jeans", keys: ["bottom", "trouser", "pant", "skirt", "jean", "short"] },
  { slug: "suits-and-jumpsuits", label: "Suits & jumpsuits", plural: "suits and jumpsuits", keys: ["suit", "jumpsuit", "set", "one-piece"] },
  { slug: "shoes", label: "Shoes", plural: "shoes", keys: ["shoe", "footwear", "boot", "heel"] },
  { slug: "bags", label: "Bags", plural: "bags", keys: ["bag", "handbag", "clutch"] },
  { slug: "jewellery", label: "Jewellery", plural: "jewellery", keys: ["jewelry", "jewellery", "earring", "necklace"] },
  { slug: "accessories", label: "Accessories", plural: "accessories", keys: ["accessory", "accessorie", "eyewear", "sunglasse", "hat", "belt", "glove"] },
];
export const PIECE_MIN_ITEMS = 4;
const typeOf = (category: string) => {
  const raw = (category || "").toLowerCase().trim();
  const k = raw.replace(/s$/, "");
  return PIECE_TYPES.find((t) => t.keys.includes(raw) || t.keys.includes(k)) || null;
};
export type PieceRow = { drop: Drop; item: DropItem; index: number };
export async function getPieceTypes(): Promise<(PieceType & { rows: PieceRow[] })[]> {
  const out = PIECE_TYPES.map((t) => ({ ...t, rows: [] as PieceRow[] }));
  for (const d of await getDrops(500)) {
    d.items.forEach((item, index) => {
      const t = typeOf(item.category);
      if (t) out.find((o) => o.slug === t.slug)!.rows.push({ drop: d, item, index });
    });
  }
  return out.filter((t) => t.rows.length >= PIECE_MIN_ITEMS);
}
export async function getPieceType(slug: string) {
  return (await getPieceTypes()).find((t) => t.slug === slug) || null;
}
export const pieceTypeOf = typeOf;
