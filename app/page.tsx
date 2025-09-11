// app/page.tsx  — RunwayTwin • Premium, conversion-optimised homepage (Server Component)
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title:
    "RunwayTwin — Your Personal Celebrity Stylist with Instant Shop Links",
  description:
    "Upload a celeb photo or name, choose your budget and occasion, and get a curated outfit — with clean, working retailer links. AI Vision + live products + body-type fit logic.",
  keywords: [
    "celebrity outfits",
    "ai stylist",
    "dress like zendaya",
    "rihanna outfit",
    "jennifer lawrence style",
    "personal stylist ai",
    "shoppable looks",
  ],
  alternates: { canonical: "https://runwaytwin.vercel.app/" },
  openGraph: {
    title:
      "RunwayTwin — Your Personal Celebrity Stylist with Instant Shop Links",
    description:
      "Celebrity style → your size, your budget, your occasion. Curated looks with working shop links.",
    url: "https://runwaytwin.vercel.app/",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "RunwayTwin — Your Personal Celebrity Stylist with Instant Shop Links",
    description:
      "Celebrity style → your size, your budget, your occasion. Curated looks with working shop links.",
    images: ["/og.jpg"],
  },
};

// quick badges used in sections
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-white/70 text-zinc-700 ring-1 ring-black/5 shadow-sm">
      {children}
    </span>
  );
}

export default function HomePage() {
  const logos = ["Net-a-Porter", "Nordstrom", "Zara", "COS", "H&M", "Mango"];

  return (
    <main className="min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-6 pt-10 pb-14">
        <div className="card overflow-hidden p-0 bg-[url('/hero.jpg')] bg-cover bg-center">
          <div className="bg-gradient-to-r from-white/90 to-white/70 p-8 sm:p-12 lg:p-16">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge>AI Vision</Badge>
              <Badge>Live Products</Badge>
              <Badge>Working Links</Badge>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              Your Personal Celebrity Stylist —{" "}
              <span className="text-amber-700/90">instantly shoppable.</span>
            </h1>

            <p className="mt-4 max-w-2xl text-[15px] leading-6 text-zinc-700">
              Drop a celebrity photo or name, choose your budget and occasion,
              and get a curated head-to-toe look — tailored to your body type —
              with clean retailer links you can shop right now.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/stylist" className="btn">
                Start Styling
              </Link>
              <Link href="/pricing" className="btn-outline">
                See Pricing
              </Link>
              <Link href="/blog" className="btn-ghost">
                Style Guides
              </Link>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-5">
            <div className="text-lg font-semibold">Real AI Vision</div>
            <p className="mt-1 text-sm text-zinc-600">
              Detects the celeb from your photo, extracts palette, silhouette &
              signatures.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-lg font-semibold">Live Products</div>
            <p className="mt-1 text-sm text-zinc-600">
              Pulls in-stock pieces by price, colour, and size across top
              retailers (EU/US).
            </p>
          </div>
          <div className="card p-5">
            <div className="text-lg font-semibold">Instant Shop Links</div>
            <p className="mt-1 text-sm text-zinc-600">
              Affiliate-ready links so you can monetise every click (optional).
            </p>
          </div>
        </div>

        {/* Retailers */}
        <div className="card mt-5 px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
            Retailers we love
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-700">
            {logos.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="font-display text-2xl tracking-tight">How It Works</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="card p-5">
            <div className="font-semibold">1) Drop your muse</div>
            <p className="mt-1 text-sm text-zinc-600">
              Upload a celeb photo or type a name with occasion & budget.
            </p>
          </div>
          <div className="card p-5">
            <div className="font-semibold">2) AI curates the look</div>
            <p className="mt-1 text-sm text-zinc-600">
              Vision + text models decode palette, silhouette & body-type fit.
            </p>
          </div>
          <div className="card p-5">
            <div className="font-semibold">3) Shop instantly</div>
            <p className="mt-1 text-sm text-zinc-600">
              Open clean retailer pages via affiliate-ready links.
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / STATS */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold">30k+</div>
            <div className="text-xs text-zinc-600 mt-1">Looks generated</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold">92%</div>
            <div className="text-xs text-zinc-600 mt-1">Buy-intent uplift</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold">EU/US</div>
            <div className="text-xs text-zinc-600 mt-1">Stock coverage</div>
          </div>
        </div>
      </section>

      {/* PRICING STRIP */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="card p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <strong>Unlock unlimited styling</strong> — seasonal wardrobe plans,
            live feeds & priority coaching.
          </p>
          <div className="flex gap-2">
            <Link href="/pricing" className="btn">
              €19/month
            </Link>
            <Link href="/pricing" className="btn-outline">
              One-off look €5
            </Link>
          </div>
        </div>
      </section>

      {/* JOURNAL PREVIEW */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl tracking-tight">From the Journal</h2>
          <Link href="/blog" className="text-sm text-zinc-600 hover:text-black">
            See all →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              slug: "zendaya-evening-glam",
              title: "Dress Like Zendaya: Red-Carpet to Real Life",
              excerpt:
                "Her formula, colours, and shoppable pieces under €100.",
              image: "/blog/zendaya.jpg",
            },
            {
              slug: "rihanna-street-luxe",
              title: "Rihanna Streetwear: The Exact Vibe (and Where to Buy)",
              excerpt:
                "Oversized outerwear, crop+wide leg, bold accessories.",
              image: "/blog/rihanna.jpg",
            },
            {
              slug: "jlaw-off-duty",
              title: "Jennifer Lawrence Minimalism: Workwear Capsule",
              excerpt:
                "Neutral palette, sleek tailoring, pointed shoes.",
              image: "/blog/jlaw.jpg",
            },
          ].map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card hover:shadow-soft overflow-hidden">
              <img
                src={p.image}
                alt={p.title}
                className="w-full h-44 object-cover"
                loading="lazy"
              />
              <div className="p-5">
                <div className="text-lg font-semibold">{p.title}</div>
                <p className="mt-2 text-sm text-zinc-600">{p.excerpt}</p>
                <div className="mt-3 text-xs text-zinc-500">Read more →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ (SEO + Objections) */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-display text-2xl tracking-tight">Frequently Asked</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="font-semibold">Does it work with my body type?</div>
            <p className="mt-1 text-sm text-zinc-600">
              Yes — our fit logic balances pear/hourglass/apple/rectangle, so
              silhouettes are flattering, not generic.
            </p>
          </div>
          <div className="card p-5">
            <div className="font-semibold">Do the links actually open products?</div>
            <p className="mt-1 text-sm text-zinc-600">
              Absolutely. We fetch live, in-stock items and link directly to the
              retailer product page (affiliate optional).
            </p>
          </div>
          <div className="card p-5">
            <div className="font-semibold">EU/US availability?</div>
            <p className="mt-1 text-sm text-zinc-600">
              You can toggle country preference; we tailor sizes, currencies and
              retailers accordingly.
            </p>
          </div>
          <div className="card p-5">
            <div className="font-semibold">Cancel any time?</div>
            <p className="mt-1 text-sm text-zinc-600">
              Of course. Try a one-off look for €5 or go Premium for €19/month —
              pause or cancel whenever you want.
            </p>
          </div>
        </div>
      </section>

      {/* JSON-LD: WebSite + Product + FAQ for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "RunwayTwin",
            url: "https://runwaytwin.vercel.app/",
            potentialAction: {
              "@type": "SearchAction",
              target:
                "https://runwaytwin.vercel.app/blog?query={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "RunwayTwin Premium Stylist",
            description:
              "Unlimited AI stylings, wardrobe plans, and live product feeds with affiliate-ready links.",
            brand: { "@type": "Brand", name: "RunwayTwin" },
            offers: [
              {
                "@type": "Offer",
                priceCurrency: "EUR",
                price: "19",
                priceValidUntil: "2099-12-31",
                availability: "https://schema.org/InStock",
                url: "https://runwaytwin.vercel.app/pricing",
              },
              {
                "@type": "Offer",
                priceCurrency: "EUR",
                price: "5",
                priceValidUntil: "2099-12-31",
                availability: "https://schema.org/InStock",
                url: "https://runwaytwin.vercel.app/pricing",
              },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Does it work with my body type?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Yes — fit logic balances pear/hourglass/apple/rectangle so silhouettes are flattering.",
                },
              },
              {
                "@type": "Question",
                name: "Do the links actually open products?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Yes. We fetch live, in-stock items and link directly to retailer product pages.",
                },
              },
              {
                "@type": "Question",
                name: "EU/US availability?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Country toggle adapts sizes, currency and retailer coverage for EU/US.",
                },
              },
              {
                "@type": "Question",
                name: "Can I cancel any time?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text:
                    "Absolutely. Try €5 one-off or cancel Premium (€19/month) whenever you like.",
                },
              },
            ],
          }),
        }}
      />

      <Footer />
    </main>
  );
}
