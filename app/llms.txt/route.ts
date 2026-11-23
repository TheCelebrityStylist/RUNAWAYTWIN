import { TOOLS } from "@/lib/tools";
import { CELEBS } from "@/lib/celebs";
import { getDrops, getCelebHubs, getPieceTypes, getEvents, HUB_MIN_LOOKS, euro } from "@/lib/drops";
import { ARTICLES } from "@/lib/journal";

export const revalidate = 3600;
const BASE = "https://runwaytwin.com";

// llms.txt: a plain map of the site for AI answer engines (https://llmstxt.org).
export async function GET() {
  const drops = await getDrops(60);
  const editorial = new Set(CELEBS.map((c) => c.slug));
  const hubs = (await getCelebHubs()).filter((h) => h.looks.length >= HUB_MIN_LOOKS && !editorial.has(h.slug));
  const pieces = await getPieceTypes();
  const events = await getEvents();
  const body = `# RunwayTwin

> RunwayTwin identifies every piece of clothing in a celebrity look or any outfit photo, names the designer when it is credited, and finds close matches at high-street, mid-range and luxury prices. Its Twin Score (0-100%) estimates how close a cheaper version gets to the original, and its Budget Dial finds the best version of a whole outfit for any budget. It can also compare a look with the user's own closet ("€0 Twin").

Key facts:
- Works from a photo, a screenshot, a link (Pinterest, TikTok, retailer pages), a video frame, or a celebrity's name.
- Identifies clothes, never people: no face recognition.
- Free: 3 looks a month. Pro: €9.99 a month including VAT, first 7 days free, cancel anytime.
- Shops: retailers that deliver across the EU, such as Zalando, ASOS, Farfetch and Vestiaire Collective. Prices in euros.
- Pre-loved: second-hand matches from eBay appear alongside new pieces where they exist.
- Drop Radar: every morning, the most-covered celebrity looks of the last few days are broken down and published at ${BASE}/looks.
- Drop Alerts: get notified in the app when new celebrity looks are broken down.
- Style Twin: upload one photo of your own outfit and see which celebrity dresses most like you, judged on clothes only (${BASE}/what-celebrity-do-i-dress-like).
- Twin Score: an AI estimate (0-100%) of how close a cheaper version gets to the original look. Prices on look pages are estimates unless a shop link is shown with a price.
- App: https://app.runwaytwin.com. RunwayTwin is a trade name of Adapthrive, based in the Netherlands.

## Browse
- [Celebrity outfits A-Z](${BASE}/style): every celebrity with a style formula or a Drop Radar look, with their latest look.
- [Celebrity looks this week](${BASE}/looks): newest Drop Radar breakdowns.
- [Shop by piece](${BASE}/pieces): celebrity pieces grouped by type, each with high-street, mid-range and luxury matches.
${pieces.map((t) => `- [Celebrity ${t.label.toLowerCase()}](${BASE}/pieces/${t.slug}): ${t.rows.length} pieces from recent celebrity looks.`).join("\n")}

## Events
${events.map((e) => `- [${e.name} ${e.year}](${BASE}/events/${e.slug}): ${e.looks.length} looks, ${e.looks.slice(0, 4).map((d) => d.celebrity).join(", ")}${e.looks.length > 4 ? " and more" : ""}.`).join("\n") || "- Updated daily."}

## Data
- [The Dupe Index](${BASE}/dupe-index): how cheaply this week's celebrity looks can be recreated; open JSON at ${BASE}/dupe-index.json (CC BY 4.0).
- [What celebrity do I dress like?](${BASE}/what-celebrity-do-i-dress-like): Style Twin from one photo, judged on clothes only.

## Journal (original data and guides)
${ARTICLES.map((a) => `- [${a.title}](${BASE}/blog/${a.slug}): ${a.description}`).join("\n")}

## Celebrity looks this week
${drops.map((d) => `- [${d.celebrity} at ${d.event}](${BASE}/looks/${d.slug}): ${d.items.length} ${d.items.length === 1 ? "piece" : "pieces"}${d.twin ? `; ${d.twin.score}% of the look for ${euro(d.twin.cost)} (originals ~${euro(d.twin.originals)})` : ""}`).join("\n") || "- Updated daily."}

## Celebrity style guides
${CELEBS.map((c) => `- [${c.name} outfits](${BASE}/style/${c.slug}): ${c.tagline}`).join("\n")}

## Celebrity outfit hubs (from Drop Radar data)
${hubs.map((h) => `- [${h.name} outfits](${BASE}/style/${h.slug}): ${h.looks.length} looks, latest ${h.latest.event}.`).join("\n") || "- Added as celebrities appear in more than one look."}

## Tools
${TOOLS.map((t) => `- [${t.title}](${BASE}/${t.slug}): ${t.description}`).join("\n")}

## Optional
- [About](${BASE}/about)
- [Affiliate disclosure](${BASE}/affiliate-disclosure)
- [Blog](${BASE}/blog)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
