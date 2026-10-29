import type { MetadataRoute } from "next";

const BASE = "https://runwaytwin.com";
const POSTS = [
  "zendaya-evening-glam",
  "rihanna-street-luxe",
  "jennifer-lawrence-off-duty",
  "blake-lively-occasion-glam",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...POSTS.map((slug) => ({ url: `${BASE}/blog/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/affiliate-disclosure`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
