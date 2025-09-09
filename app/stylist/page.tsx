"use client";

import { useRef, useState } from "react";

/** Retailer search helpers (always returns a working URL) */
function retailerSearchLink(retailer: string = "", query: string = "") {
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
function ensureUrl(item: any) {
  return item?.url && item.url !== "#" ? item.url : retailerSearchLink(item?.retailer, item?.name || "");
}

/** Build the final href. If /clk exists + AFFILIATE_BASE is set, it will monetize. */
function shopHref(item: any) {
  const base = ensureUrl(item);
  const qs = new URLSearchParams({ u: base, rid: item?.retailer || "", pid: item?.id || "" }).toString();
  return `/clk?${qs}`;
}

type Product = {
  id: string;
  name: string;
  retailer: string;
  price: number;
  category: "top" | "bottom" | "outerwear" | "shoes" | "accessories";
  url?: string;
};

export default function StylistPage() {
  const [messages, setMessages] = useState<string[]>([
    "Welcome, love ✨ Drop a celebrity name or image + tell me the occasion and budget tier (high-street / mid / luxury). I’ll curate a head-to-toe look with working links.",
  ]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, Product[]>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSend() {
    if (!input && !image) return;
    setLoading(true);
    setMessages((m) => [...m, `🧑‍💬 ${input || "(image uploaded)"}`]);

    // Call our simple product API (works without keys)
    const r = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: input || "", image: !!image }),
    });
    const data = (await r.json()) as { picks: Record<string, Product[]>; reply: string };

    // Show AI-ish reply (server builds a clean, safe message)
    setMessages((m) => [...m, `👗 ${data.reply}`]);

    setResults(data.picks);
    setLoading(false);
    setInput("");
    if (fileRef.current) fileRef.current.value = "";
    setImage(null);
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-rt-black text-white font-semibold">RT</div>
          <div>
            <div className="text-lg font-display tracking-tight">RunwayTwin</div>
            <div className="text-xs text-rt-charcoal/70">Celebrity Stylist — live shoppable looks</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <a className="btn-outline" href="/">Home</a>
          <a className="btn" href="/upgrade">Upgrade</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 grid gap-6 lg:grid-cols-5 pb-20">
        {/* Left: Preferences (basic) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="section-title">Your Preferences</div>
            <div className="mt-3 text-sm text-rt-charcoal/80">Country</div>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              <option>EU Stock</option>
              <option>US Stock</option>
            </select>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div>
                <div className="text-sm text-rt-charcoal/80">Top size</div>
                <input className="w-full rounded-xl border px-3 py-2 text-sm" defaultValue="M" />
              </div>
              <div>
                <div className="text-sm text-rt-charcoal/80">Bottom size</div>
                <input className="w-full rounded-xl border px-3 py-2 text-sm" defaultValue="M" />
              </div>
              <div>
                <div className="text-sm text-rt-charcoal/80">Shoe EU</div>
                <input className="w-full rounded-xl border px-3 py-2 text-sm" defaultValue="38" />
              </div>
            </div>

            <div className="mt-4 text-sm text-rt-charcoal/80">Body type (optional)</div>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              <option value="">Select…</option>
              <option value="pear">Pear</option>
              <option value="apple">Apple</option>
              <option value="hourglass">Hourglass</option>
              <option value="rectangle">Rectangle</option>
            </select>

            <div className="mt-4 text-sm text-rt-charcoal/80">Budget tier</div>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
              <option value="highstreet">High-street (€15–80)</option>
              <option value="mid" selected>
                Mid (€80–300)
              </option>
              <option value="luxury">Luxury (€300+)</option>
            </select>
          </div>

          <div className="card p-5">
            <div className="section-title">Style Intelligence</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-rt-charcoal/80">
              <li>Vision detects celeb & extracts palette/silhouette</li>
              <li>Occasion, body-type & budget parsing</li>
              <li>Live retailer search links (affiliate-ready)</li>
            </ul>
          </div>
        </div>

        {/* Right: Chat + Results */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-5">
            <div className="section-title">Stylist Chat</div>

            <div className="mt-3 space-y-2 max-h-[320px] overflow-auto rounded-xl border p-3 bg-white">
              {messages.map((m, i) => (
                <div key={i} className={i % 2 ? "bg-rt-blush/30 rounded-xl p-2" : ""}>
                  {m}
                </div>
              ))}
              {loading && <div className="text-sm text-rt-charcoal/70">Curating your look…</div>}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., Dress me like Zendaya for a party — mid"
                className="flex-1 rounded-xl border px-3 py-2 text-sm"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                📎 Add image
              </label>
              <button onClick={onSend} className="btn">
                Send
              </button>
            </div>
          </div>

          <div className="card p-5">
            <div className="section-title">Your Styled Look</div>
            {!Object.keys(results).length ? (
              <div className="mt-2 text-sm text-rt-charcoal/80">
                Tell me your muse & occasion — I’ll pull a head-to-toe look with links.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(results).map(([k, v]) =>
                  v.map((item) => (
                    <a key={item.id} href={shopHref(item)} target="_blank" rel="noreferrer" className="rounded-2xl border p-3 hover:shadow-soft">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-rt-charcoal/70">
                        {item.retailer} • €{item.price}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-rt-charcoal/60">{k}</div>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
