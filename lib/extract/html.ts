export function extractMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["'][^>]+content=["']([^"']+)["']`,
      "i"
    );
    const match = html.match(re);
    if (match && match[1]) return match[1].trim();
  }
  return null;
}

export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

export function extractFirstImage(html: string): string | null {
  const meta = extractMeta(html, ["og:image", "twitter:image", "twitter:image:src"]);
  if (meta) return meta;
  const match = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : null;
}
