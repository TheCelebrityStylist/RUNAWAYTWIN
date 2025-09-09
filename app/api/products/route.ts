import { NextResponse } from "next/server";

/** Tiny, safe formatter: produce working retailer search links now. */
function searchUrl(retailer: string, query: string) {
  const q = encodeURIComponent(query);
  const r = retailer.toLowerCase();
  if (r.includes("zara")) return `https://www.zara.com/search?searchTerm=${q}`;
  if (r.includes("h&m") || r.includes("h&amp;m") || r.includes("hm")) return `https://www2.hm.com/en/search-results.html?q=${q}`;
  if (r.includes("mango")) return `https://shop.mango.com/search?q=${q}`;
  if (r.includes("cos")) return `https://www.cos.com/search?q=${q}`;
  if (r.includes("net-a-porter") || r.includes("net a porter")) return `https://www.net-a-porter.com/shop/search?q=${q}`;
  if (r.includes("stories")) return `https://www.stories.com/search?q=${q}`;
  if (r.includes("arket")) return `https://www.arket.com/search?q=${q}`;
  if (r.includes("charles") && r.includes("keith")) return `https://www.charleskeith.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

export async function POST(req: Request) {
  const { prompt = "", image = false } = await req.json();

  // Very light prompt parsing (works without keys).
  const text = String(prompt).toLowerCase();
  const celeb =
    ["zendaya", "rihanna", "blake lively", "jennifer lawrence"].find((n) => text.includes(n)) || "your muse";
  const occasion = text.includes("work")
    ? "work"
    : text.includes("party") || text.includes("evening")
    ? "party"
    : text.includes("event")
    ? "event"
    : "everyday";
  const tier = text.includes("luxury") ? "luxury" : text.includes("high") || text.includes("budget") ? "high-street" : "mid";

  // Build category queries by vibe
  const queries = {
    top:
      celeb === "zendaya"
        ? "structured satin top strong shoulders"
        : celeb === "rihanna"
        ? "cropped tee or mesh bodysuit"
        : celeb === "blake lively"
        ? "silk blouse feminine"
        : "crisp poplin shirt minimalist",
    bottom:
      celeb === "zendaya"
        ? "wide leg tailored trousers"
        : celeb === "rihanna"
        ? "wide leg denim high waist"
        : celeb === "blake lively"
        ? "bias midi skirt"
        : "high waisted wide leg trousers",
    outerwear:
      celeb === "zendaya"
        ? "sharp shoulder blazer"
        : celeb === "rihanna"
        ? "cropped leather jacket"
        : celeb === "blake lively"
        ? "statement coat"
        : "cropped leather jacket",
    shoes:
      occasion === "party"
        ? "strappy heel"
        : occasion === "work"
        ? "loafer or low pump"
        : "pointed flats",
    accessories:
      celeb === "rihanna"
        ? "bold sunglasses layered chains"
        : "minimal gold hoops structured tote",
  };

  const budgetCap = tier === "luxury" ? 800 : tier === "mid" ? 300 : 80;
  const retailers = tier === "luxury" ? ["Net-A-Porter", "COS"] : ["Zara", "H&M", "Mango", "COS"];

  // Build 1–2 items per category with real, working URLs (retailer search).
  const picks = Object.fromEntries(
    Object.entries(queries).map(([cat, q]) => {
      const name = `${q} ${occasion}`;
      const items = retailers.slice(0, 2).map((r, i) => ({
        id: `${cat}-${i}`,
        name,
        retailer: r,
        price: Math.round(budgetCap * (0.7 + 0.2 * i)),
        category: cat,
        url: searchUrl(r, name),
      }));
      return [cat, items];
    })
  );

  const reply = `Absolutely. Channeling ${celeb} for ${occasion} in the ${tier} tier — I’ve pulled a head-to-toe look with working shop links below.`;

  return NextResponse.json({ picks, reply });
}
