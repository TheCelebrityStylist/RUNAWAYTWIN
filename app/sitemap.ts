import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { CELEBS } from "@/lib/celebs";
import { getDrops, getEvents } from "@/lib/drops";

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
  return [
    { url: `${BASE}/dupe-index`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/looks`, lastModified: drops[0]?.published_at ? new Date(drops[0].published_at) : now, changeFrequency: "daily", priority: 0.95 },
    ...events.map((e) => ({ url: `${BASE}/events/${e.slug}`, lastModified: e.latest ? new Date(e.latest) : now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...drops.map((d) => ({ url: `${BASE}/looks/${d.slug}`, lastModified: d.published_at ? new Date(d.published_at) : now, changeFrequency: "weekly" as const, priority: 0.85 })),
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...TOOLS.map((t) => ({ url: `${BASE}/${t.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 })),
    { url: `${BASE}/style`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...CELEBS.map((c) => ({ url: `${BASE}/style/${c.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...POSTS.map((slug) => ({ url: `${BASE}/blog/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/affiliate-disclosure`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
