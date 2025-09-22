import type { MetadataRoute } from "next";
import { absoluteUrl } from "./utils";

export type SitemapEntry = {
  readonly path: string;
  readonly changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  readonly priority: number;
  readonly lastModified?: string;
};

export const SITEMAP_ROUTES: readonly SitemapEntry[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/stylist", changeFrequency: "daily", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing/success", changeFrequency: "weekly", priority: 0.4 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/affiliate-disclosure", changeFrequency: "yearly", priority: 0.2 },
  { path: "/disclosure", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
] as const;

export function resolveSitemapEntries(now: Date = new Date()): MetadataRoute.Sitemap {
  return SITEMAP_ROUTES.map((entry) => ({
    url: absoluteUrl(entry.path),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    lastModified: entry.lastModified ? new Date(entry.lastModified) : now,
  }));
}
