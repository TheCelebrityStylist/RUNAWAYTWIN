import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { CELEBS } from "@/lib/celebs";
import { getDrops, getEvents, getCelebHubs, getPieceTypes, HUB_MIN_LOOKS } from "@/lib/drops";
import { ARTICLES } from "@/lib/journal";

export const revalidate = 3600;

const BASE = "https://runwaytwin.com";
const POSTS = [
  "zendaya-evening-glam",
  "rihanna-street-luxe",
  "jennifer-lawrence-off-duty",
  "blake-lively-occasion-glam",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const drops = await getDrops(500);
  const events = await getEvents();
  const hubs = await getCelebHubs();
  const pieces = await getPieceTypes();
  const editorial = new Set(CELEBS.map((c) => c.slug));
  const latestOf = (slug: string) => hubs.find((h) => h.slug === slug)?.latest.published_at;
  const STATIC = new Date("2026-11-24"); // last edit of hand-written pages; bump when they change
  const d = (x?: string) => (x ? new Date(x) : now);
  return [
    { url: `${BASE}/dupe-index`, lastModified: d(drops[0]?.published_at), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/looks`, lastModified: drops[0]?.published_at ? new Date(drops[0].published_at) : now, changeFrequency: "daily", priority: 0.95 },
    ...events.map((e) => ({ url: `${BASE}/events/${e.slug}`, lastModified: e.latest ? new Date(e.latest) : now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...drops.map((d) => ({ url: `${BASE}/looks/${d.slug}`, lastModified: d.published_at ? new Date(d.published_at) : now, changeFrequency: "weekly" as const, priority: 0.85 })),
    { url: `${BASE}/`, lastModified: d(drops[0]?.published_at), changeFrequency: "daily", priority: 1 },
    ...TOOLS.map((t) => ({ url: `${BASE}/${t.slug}`, lastModified: STATIC, changeFrequency: "monthly" as const, priority: 0.9 })),
    { url: `${BASE}/style`, lastModified: d(drops[0]?.published_at), changeFrequency: "daily", priority: 0.9 },
    ...CELEBS.map((c) => ({ url: `${BASE}/style/${c.slug}`, lastModified: latestOf(c.slug) ? d(latestOf(c.slug)) : STATIC, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...hubs
      .filter((h) => h.looks.length >= HUB_MIN_LOOKS && !editorial.has(h.slug))
      .map((h) => ({ url: `${BASE}/style/${h.slug}`, lastModified: d(h.latest.published_at), changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${BASE}/pieces`, lastModified: d(drops[0]?.published_at), changeFrequency: "daily", priority: 0.8 },
    ...pieces.map((t) => ({ url: `${BASE}/pieces/${t.slug}`, lastModified: d(t.rows[0]?.drop.published_at), changeFrequency: "daily" as const, priority: 0.8 })),
    { url: `${BASE}/blog`, lastModified: STATIC, changeFrequency: "weekly", priority: 0.7 },
    ...ARTICLES.map((a) => ({ url: `${BASE}/blog/${a.slug}`, lastModified: new Date(a.updated || a.published), changeFrequency: "monthly" as const, priority: 0.85 })),
    ...POSTS.map((slug) => ({ url: `${BASE}/blog/${slug}`, lastModified: STATIC, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${BASE}/about`, lastModified: STATIC, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/contact`, lastModified: STATIC, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/affiliate-disclosure`, lastModified: STATIC, changeFrequency: "yearly", priority: 0.2 },
  ];
}
