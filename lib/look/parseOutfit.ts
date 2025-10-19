export type OutfitItem = {
  category: string;
  brandItem: string;
  price?: string;
  retailer?: string;
  link?: string;
  image?: string;
};

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function extractSection(text: string, header: string): string {
  const pattern = new RegExp(`${header}\s*:`, "i");
  const match = pattern.exec(text);
  if (!match) return text;
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const endMatch = rest.match(/\n{2,}|\n[A-Z][^\n]{0,40}:/);
  return endMatch ? rest.slice(0, endMatch.index) : rest;
}

export function parseOutfit(text: string): OutfitItem[] {
  if (!text) return [];
  const outfitBlock = extractSection(text, "Outfit");
  const lines = outfitBlock.split(/\r?\n/);
  const items: OutfitItem[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!/^[-•]/.test(line)) continue;
    if (!line.includes("—")) continue;

    const dashIndex = line.indexOf("—");
    const categoryRaw = line.slice(1, dashIndex).replace(/[•\-]/, "");
    const category = cleanLine(categoryRaw);
    if (!category) continue;

    const afterDash = line.slice(dashIndex + 1).trim();
    const imageMatch = afterDash.match(/(?:Image|image|img)\s*[:=]\s*(https?:[^\s]+)\b/);
    const image = imageMatch ? imageMatch[1] : undefined;
    const afterImage = imageMatch ? afterDash.replace(imageMatch[0], "").trim() : afterDash;

    let link: string | undefined;
    let noUrl = afterImage;

    const markdownMatch = afterImage.match(/\[([^\]]+)\]\((https?:[^\s)]+)\)/);
    if (markdownMatch) {
      link = markdownMatch[2];
      noUrl = afterImage.replace(markdownMatch[0], markdownMatch[1]).trim();
    } else {
      const urlMatch = afterImage.match(/https?:\/\/[^\s)]+/);
      if (urlMatch) {
        link = urlMatch[0];
        noUrl = afterImage.replace(urlMatch[0], "").trim();
      }
    }

    noUrl = noUrl.replace(/^[-•·]\s*/, "").trim();

    const parenIndex = noUrl.indexOf("(");
    const dotIndex = noUrl.indexOf("·");
    let brandItem = "";
    if (parenIndex !== -1) {
      brandItem = cleanLine(noUrl.slice(0, parenIndex));
    } else if (dotIndex !== -1) {
      brandItem = cleanLine(noUrl.slice(0, dotIndex));
    } else {
      brandItem = cleanLine(noUrl);
    }

    let price: string | undefined;
    let retailer: string | undefined;
    if (parenIndex !== -1) {
      const close = noUrl.indexOf(")", parenIndex);
      if (close !== -1) {
        const inside = noUrl.slice(parenIndex + 1, close);
        const parts = inside.split(",").map((p) => cleanLine(p)).filter(Boolean);
        if (parts.length === 1) {
          if (/[€$£]|USD|EUR|GBP|CAD|AUD/i.test(parts[0])) price = parts[0];
          else retailer = parts[0];
        } else if (parts.length >= 2) {
          price = parts[0];
          retailer = parts.slice(1).join(", ");
        }
      }
    }

    items.push({ category, brandItem, price, retailer, link, image });
  }

  return items;
}
