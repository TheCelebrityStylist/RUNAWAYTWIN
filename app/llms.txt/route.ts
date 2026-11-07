import { TOOLS } from "@/lib/tools";
import { CELEBS } from "@/lib/celebs";
import { getDrops, euro } from "@/lib/drops";
import { ARTICLES } from "@/lib/journal";

export const revalidate = 3600;
const BASE = "https://runwaytwin.com";

// llms.txt: a plain map of the site for AI answer engines (https://llmstxt.org).
export async function GET() {
  const drops = await getDrops(60);
  const body = `# RunwayTwin

> RunwayTwin identifies every piece of clothing in a celebrity look or any outfit photo, names the designer when it is credited, and finds close matches at high-street, mid-range and luxury prices. Its Twin Score (0-100%) estimates how close a cheaper version gets to the original, and its Budget Dial finds the best version of a whole outfit for any budget. It can also compare a look with the user's own closet ("€0 Twin").

Key facts:
- Works from a photo, a screenshot, a link (Pinterest, TikTok, retailer pages), a video frame, or a celebrity's name.
- Identifies clothes, never people: no face recognition.
- Free: 3 looks a month. Pro: €9.99/month.
- Drop Radar: every morning, the most-covered celebrity looks of the last few days are broken down and published at ${BASE}/looks.
- Made in the Netherlands; prices in euros; shops include Zalando, ASOS, Farfetch and Vestiaire Collective.

## Data
- [The Dupe Index](${BASE}/dupe-index): how cheaply this week's celebrity looks can be recreated; open JSON at ${BASE}/dupe-index.json (CC BY 4.0).
- [What celebrity do I dress like?](${BASE}/what-celebrity-do-i-dress-like): Style Twin from one photo, judged on clothes only.

## Journal (original data and guides)
${ARTICLES.map((a) => `- [${a.title}](${BASE}/blog/${a.slug}): ${a.description}`).join("\n")}

## Celebrity looks this week
${drops.map((d) => `- [${d.celebrity} at ${d.event}](${BASE}/looks/${d.slug}): ${d.items.length} ${d.items.length === 1 ? "piece" : "pieces"}${d.twin ? `; ${d.twin.score}% of the look for ${euro(d.twin.cost)} (originals ~${euro(d.twin.originals)})` : ""}`).join("\n") || "- Updated daily."}

## Celebrity style guides
${CELEBS.map((c) => `- [${c.name} outfits](${BASE}/style/${c.slug}): ${c.tagline}`).join("\n")}

## Tools
${TOOLS.map((t) => `- [${t.title}](${BASE}/${t.slug}): ${t.description}`).join("\n")}

## Optional
- [About](${BASE}/about)
- [Affiliate disclosure](${BASE}/affiliate-disclosure)
- [Blog](${BASE}/blog)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
