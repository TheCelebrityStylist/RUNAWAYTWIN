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

export const euro = (n?: number | null) => (n ? `€${Math.round(n).toLocaleString("nl-NL")}` : "");
export const fmtDate = (d: string) => {
  try {
    return new Date(d + (d.length === 10 ? "T12:00:00Z" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
};
export const slugOfCeleb = (name: string) => name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
