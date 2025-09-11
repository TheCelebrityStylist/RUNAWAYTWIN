// app/page.tsx
import type { Metadata } from "next";

/** ─────────────────────────────────────────────────────────────
 * SEO: page-level metadata
 * (Server Component – safe to export metadata)
 * ───────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: "RunwayTwin — Your Personal Celebrity Stylist (Instantly Shoppable)",
  description:
    "Upload a celebrity photo or name, set your budget and occasion, and get a curated, body-type–aware look with live retailer product links (EU/US).",
  alternates: { canonical: "https://runwaytwin.vercel.app/" },
  openGraph: {
    title: "RunwayTwin — Personal Celebrity Stylist",
    description:
      "AI vision + live product feeds. Curated outfits inspired by your favourite celebs — with real, working shop links.",
    url: "https://runwaytwin.vercel.app/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RunwayTwin — Personal Celebrity Stylist",
    description:
      "AI-curated celebrity looks with real retailer links you can shop instantly.",
  },
};

/** Lightweight utilities (purely for display) */
function Stat({ kpi, label }: { kpi: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-white/80 p-6 text-center shadow-sm">
      <div className="font-serif text-3xl md:text-4xl">{kpi}</div>
      <div className="mt-1 text-sm text-zinc-600">{label}</div>
    </div>
  );
}

function Feature({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white/90 p-5 shadow-sm">
      <div className="mb-1 font-medium text-zinc-900">{title}</div>
      <div className="text-[14px] leading-6 text-zinc-600">{children}</div>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────────
 * PAGE
 * ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      {/* HERO */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-b from-white to-[#faf7f3] p-8 md:p-16 shadow-[0_1px_40px_rgba(0,0,0,0.04)]">
        <div className="mx-auto max-w-5xl">
          {/* Micro-badges */}
          <div className="mb-6 flex flex-wrap gap-2 text-[11px] font-medium text-zinc-600">
            <span className="rounded-full border px-3 py-1">AI Vision</span>
            <span className="rounded-full border px-3 py-1">Live Products</span>
            <span className="rounded-full border px-3 py-1">Working Links</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-black md:text-[54px]">
            Your Personal Celebrity Stylist —{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b46b31] to-[#cc8852]">
              instantly shoppable.
            </span>
          </h1>

          {/* Subhead */}
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-zinc-700">
            Upload a celebrity photo or name, choose your budget & occasion, and
            our AI curates a head-to-toe look — tailored to your body type. With{" "}
            <strong>real retailer links</strong> you can shop right now. No dead
            ends. No guesswork.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/stylist"
              className="rounded-full bg-black px-7 py-3 text-sm font-semibold text-white shadow hover:opacity-90 transition"
            >
              Start Styling
            </a>
            <a
              href="/pricing"
              className="rounded-full border px-7 py-3 text-sm font-semibold text-black hover:bg-white transition"
            >
              See Pricing
            </a>
            <a
              href="/blog"
              className="rounded-full border px-7 py-3 text-sm font-semibold text-black hover:bg-white transition"
            >
              Style Guides
            </a>
          </div>

          {/* Key features */}
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Feature title="Real AI Vision">
              Detects the celeb in your photo, then extracts palette, silhouette
              & signature style cues.
            </Feature>
            <Feature title="Live Products (EU/US)">
              Pulls in-stock pieces by price, colour & size across major
              retailers. Updated in real time.
            </Feature>
            <Feature title="Instant Shop Links">
              Affiliate-ready links that open the{" "}
              <strong>actual product pages</strong> — zero drop-off.
            </Feature>
          </div>
        </div>
      </section>

      {/* Retailers strip */}
      <section className="mt-10">
        <div className="rounded-3xl border bg-white/70 p-4 shadow-sm">
          <div className="mb-3 text-xs font-medium tracking-wide text-zinc-600">
            RETAILERS WE LOVE
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
            <span>Net-a-Porter</span>
            <span>Nordstrom</span>
            <span>Zara</span>
            <span>COS</span>
            <span>H&M</span>
            <span>Mango</span>
            <span>& Other Stories</span>
          </div>
        </div>
      </section>

      {/* How it works + stats */}
      <section className="mt-14">
        <h2 className="font-serif text-3xl tracking-tight">How It Works</h2>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Feature title="1) Drop your muse">
            Upload a celeb photo or type a name with occasion & budget.
          </Feature>
          <Feature title="2) AI curates the look">
            Vision + text models decode palette, silhouette & body-type fit.
          </Feature>
          <Feature title="3) Shop instantly">
            Open clean retailer pages via affiliate-ready links (optional).
          </Feature>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Stat kpi="30k+" label="Looks generated" />
          <Stat kpi="18–32%" label="Buy-intent uplift (avg.)" />
          <Stat kpi="EU/US" label="Stock coverage" />
        </div>
      </section>

      {/* Conversion band */}
      <section className="mt-14">
        <div className="rounded-3xl border bg-gradient-to-r from-[#fffaf5] to-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <p className="max-w-3xl text-[15px] leading-7 text-zinc-800">
              <strong>Unlock unlimited styling</strong> — seasonal wardrobe
              plans, live retailer feeds, priority coaching & analytics for
              creators. Pause any time.
            </p>
            <div className="flex gap-3">
              <a
                href="/pricing"
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-90 transition"
              >
                €19/month
              </a>
              <a
                href="/pricing"
                className="rounded-full border px-6 py-3 text-sm font-semibold hover:bg-white transition"
              >
                One-off look €5
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / USP cards */}
      <section className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Feature title="Made for real bodies">
          Our fit logic balances pear/hourglass/apple/rectangle so silhouettes
          are flattering — not generic.
        </Feature>
        <Feature title="Links that actually open products">
          We fetch live, in-stock items and link directly to retailer product
          pages (affiliate optional).
        </Feature>
        <Feature title="EU/US aware">
          Toggle country preference; we tailor sizes, currencies and retailer
          availability automatically.
        </Feature>
        <Feature title="Cancel any time">
          Try a one-off look for €5 or go Premium for €19/month — pause or
          cancel whenever you want.
        </Feature>
      </section>

      {/* Journal preview */}
      <section className="mt-16">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-3xl tracking-tight">From the Journal</h2>
          <a
            href="/blog"
            className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline"
          >
            See all →
          </a>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <a
            href="/blog/zendaya-evening-glam"
            className="rounded-2xl border bg-white/90 p-5 shadow-sm hover:shadow transition"
          >
            <div className="text-lg font-medium text-zinc-900">
              Dress Like Zendaya: Red-Carpet to Real Life
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Her formula, colours, and shoppable pieces under €100.
            </p>
            <div className="mt-3 text-sm font-medium text-zinc-800">
              Read guide →
            </div>
          </a>

          <a
            href="/blog/rihanna-street-luxe"
            className="rounded-2xl border bg-white/90 p-5 shadow-sm hover:shadow transition"
          >
            <div className="text-lg font-medium text-zinc-900">
              Rihanna Streetwear: The Exact Vibe (and Where to Buy)
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Oversized outerwear, crop+wide leg, bold accessories — linked.
            </p>
            <div className="mt-3 text-sm font-medium text-zinc-800">
              Read guide →
            </div>
          </a>

          <a
            href="/blog/jennifer-lawrence-workwear"
            className="rounded-2xl border bg-white/90 p-5 shadow-sm hover:shadow transition"
          >
            <div className="text-lg font-medium text-zinc-900">
              Jennifer Lawrence Minimalism: Workwear Capsule
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Neutral palette, sleek tailoring, pointed shoes.
            </p>
            <div className="mt-3 text-sm font-medium text-zinc-800">
              Read guide →
            </div>
          </a>
        </div>
      </section>

      {/* Footer mini (keeps page self-contained if you don’t have a global one) */}
      <section className="mt-20 border-t pt-8 text-sm text-zinc-600">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div>
            <div className="text-zinc-900 font-medium">RunwayTwin</div>
            <p className="mt-2">
              Celebrity stylist AI — curated looks with working shop links.
            </p>
            <p className="mt-2 text-xs">
              Disclosure: some outbound links are affiliate links; we may earn a
              commission at no extra cost to you.
            </p>
          </div>

          <div>
            <div className="text-zinc-900 font-medium">Product</div>
            <ul className="mt-2 space-y-2">
              <li>
                <a className="hover:underline" href="/stylist">
                  Stylist
                </a>
              </li>
              <li>
                <a className="hover:underline" href="/pricing">
                  Pricing
                </a>
              </li>
              <li>
                <a className="hover:underline" href="/blog">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-zinc-900 font-medium">Company</div>
            <ul className="mt-2 space-y-2">
              <li>
                <a className="hover:underline" href="/about">
                  About
                </a>
              </li>
              <li>
                <a className="hover:underline" href="/contact">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-zinc-900 font-medium">Legal</div>
            <ul className="mt-2 space-y-2">
              <li>
                <a className="hover:underline" href="/disclosure">
                  Affiliate Disclosure
                </a>
              </li>
              <li>
                <a className="hover:underline" href="/privacy">
                  Privacy
                </a>
              </li>
              <li>
                <a className="hover:underline" href="/terms">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-6 text-xs">© {new Date().getFullYear()} RunwayTwin — All rights reserved.</p>
      </section>

      {/* JSON-LD for extra SEO (safe in server component) */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "RunwayTwin",
            url: "https://runwaytwin.vercel.app/",
            potentialAction: {
              "@type": "SearchAction",
              target:
                "https://runwaytwin.vercel.app/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
    </main>
  );
}

