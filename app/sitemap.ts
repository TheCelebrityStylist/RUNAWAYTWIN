import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://runwaytwin.vercel.app";
  const now = new Date().toISOString();
  const routes = ["", "/stylist", "/about", "/pricing", "/blog", "/contact", "/careers", "/terms", "/privacy"];
  return routes.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));
}
