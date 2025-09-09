// app/page.tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "RunwayTwin – Your Personal Celebrity Stylist",
  description:
    "AI celebrity stylist that turns celeb inspiration into shoppable, flattering outfits. Upload a photo or name, set your budget, and shop clean retailer links.",
  alternates: { canonical: "https://runwaytwin.vercel.app" },
  openGraph: {
    title: "RunwayTwin – Your Personal Celebrity Stylist",
    description:
      "Upload a celebrity photo or name, choose your budget and occasion, and get a curated outfit with working shop links.",
    url: "https://runwaytwin.vercel.app",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* ===== HERO ===== */}
      <section className="mx-auto max-w-7xl px-6 pt-14">
        <div className="hero-wrap shadow-soft">
          <img src="/hero.jpg" alt="" aria-hidden />
          <div className="hero-content">
            <span className="badge">AI Vision • Live Products • Working Links</span>
            <h1 className="mt-4 font-display text-5xl leading-tight tracking-tight">
              Your Personal Celebrity Stylist —{" "}
              <span className="gradient-text">instantly shoppable</span>.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-rt-charcoal/85">
              Upload a celebrity photo or name, choose your budget and occasion, and
              get a curated head-to-toe look with clean retailer links you can shop
              right now.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="/stylist" className="btn">Start Styling</a>
              <a href="/pricing" className="btn-outline">See Pricing</a>
            </div>
          </div>
        </div>

        {/* ===== FEATURE CARDS ===== */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-lg font-medium">Real AI Vision</div>
            <p className="text-sm text-zinc-600 mt-1">
              Detect the celeb from your photo, extract palette, silhouette & signatures.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-lg font-medium">Live Products</div>
            <p className="text-sm text-zinc-600 mt-1">
              Pull in-stock pieces by price, color & size from major retailers.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-lg font-medium">Instant Shop Links</div>
            <p className="text-sm text-zinc-600 mt-1">
              Affiliate-ready links so you can monetize every click.
            </p>
          </div>
        </div>

        {/* ===== RETAILER STRIP ===== */}
        <div className="mt-10 card p-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-600">
          <span className="uppercase tracking-wide">Retailers we love:</span>
          <span>Net-a-Porter</span>
          <span>Nordstrom</span>
          <span>Zara</span>
          <span>COS</span>
          <span>H&M</span>
          <span>Mango</span>
        </div>

        {/* ===== HOW IT WORKS ===== */}
        <section className="mt-14">
          <h2 className="font-display text-2xl tracking-tight">How It Works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <b>1) Drop your muse</b>
              <p className="text-sm text-zinc-600 mt-1">
                Upload a celeb photo or type a name with occasion & budget.
              </p>
            </div>
            <div className="card p-5">
              <b>2) AI curates the look</b>
              <p className="text-sm text-zinc-600 mt-1">
                We balance body type, palette and celeb signatures.
              </p>
            </div>
            <div className="card p-5">
              <b>3) Shop instantly</b>
              <p className="text-sm text-zinc-600 mt-1">
                Open clean retailer pages via affiliate-ready links.
              </p>
            </div>
          </div>
        </section>

        {/* ===== PRICING TEASER ===== */}
        <section className="mt-14 grid gap-5 sm:grid-cols-2">
          <div className="card p-6">
            <div className="text-sm text-zinc-600">Premium Stylist</div>
            <div className="mt-1 text-4xl font-semibold">
              €19<span className="text-lg">/month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>Unlimited stylings</li>
              <li>Priority looks & wardrobe plans</li>
              <li>Live feeds + affiliate analytics</li>
            </ul>
            <a className="btn mt-6 inline-block" href="/upgrade">Go Premium</a>
          </div>

          <div className="card p-6">
            <div className="text-sm text-zinc-600">One-Off Look</div>
            <div className="mt-1 text-4xl font-semibold">€5</div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>Single styling session</li>
              <li>Working product links</li>
              <li>No subscription</li>
            </ul>
            <a className="btn-outline mt-6 inline-block" href="/stylist">Try One-Off</a>
          </div>
        </section>

        {/* ===== BLOG TEASER ===== */}
        <section className="mt-14">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl tracking-tight">From the Journal</h2>
            <a href="/blog" className="text-sm text-zinc-700 hover:text-black">See all →</a>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <a href="/blog/dress-like-zendaya" className="card p-5 hover:shadow-soft">
              <div className="text-lg font-medium">
                Dress Like Zendaya: Red-Carpet to Real Life
              </div>
              <p className="text-sm text-zinc-600 mt-2">
                Her formula, colors, and shoppable pieces under €100.
              </p>
              <div className="mt-3 text-xs text-zinc-500">Read more →</div>
            </a>
            <a href="/blog/rihanna-streetwear-guide" className="card p-5 hover:shadow-soft">
              <div className="text-lg font-medium">
                Rihanna Streetwear: The Exact Vibe (and Where to Buy)
              </div>
              <p className="text-sm text-zinc-600 mt-2">
                Oversized outerwear, crop+wide leg, bold accessories.
              </p>
              <div className="mt-3 text-xs text-zinc-500">Read more →</div>
            </a>
            <a href="/blog/jennifer-lawrence-minimalism" className="card p-5 hover:shadow-soft">
              <div className="text-lg font-medium">
                Jennifer Lawrence Minimalism: Workwear Capsule
              </div>
              <p className="text-sm text-zinc-600 mt-2">
                Neutral palette, sleek tailoring, pointed shoes.
              </p>
              <div className="mt-3 text-xs text-zinc-500">Read more →</div>
            </a>
          </div>
        </section>

        {/* ===== CTA BAND ===== */}
        <div className="mt-14 card p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <b>Unlock unlimited styling</b> — seasonal wardrobe plans, live feeds & priority coaching.
          </p>
          <div className="flex gap-2">
            <a href="/upgrade" className="btn">€19/month</a>
            <a href="/stylist" className="btn-outline">One-off look €5</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
