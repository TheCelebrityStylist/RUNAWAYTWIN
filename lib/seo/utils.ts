import { SITE_URL } from "./constants";

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  if (path === "/") return SITE_URL;
  if (path.startsWith("#")) return `${SITE_URL}${path}`;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalised}`;
}
