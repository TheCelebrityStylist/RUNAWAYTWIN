import type { MetadataRoute } from "next";
import { resolveSitemapEntries } from "@/lib/seo/sitemap";

export default function sitemap(): MetadataRoute.Sitemap {
  return resolveSitemapEntries();
}
