import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Ultimate Homepage (Server Component, SEO + Conversion)
   - Luxury, editorial design with Tailwind
   - Persuasive copywriting focused on outcomes & proof
   - Rich SEO (metadata + JSON-LD for WebSite, Product, FAQ, Organization)
   - No client hooks -> safe on Vercel
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "RunwayTwin — AI Celebrity Stylist • Curated, Body-Type Flattering Looks with Real Shop Links",
  description:
    "Drop a celeb photo or name, pick your budget & occasion, and get a shoppable outfit that flatters your body type. EU/US stock, affiliate-ready links, zero dead ends.",
  alternates: { canonical: "https://runwaytwin.vercel.app/" },
  keywords: [
    "AI stylist",
    "celebrity outfits",
    "dress like zendaya",
    "rihanna outfit",
    "jennifer lawrence style",
    "personal stylist AI",
    "shoppable outfits",
    "outfit generator",
    "body type styling",
  ],
  openGraph: {
    title:
      "RunwayTwin — AI Celebrity Stylist • Curated Looks with Real Shop Links",
    description:
      "Turn celebrity inspiration into outfits you actually buy. Live products, body-type aware, affiliate-ready links.",
    url: "https://runwaytwin.vercel.app/",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "RunwayTwin — AI Celebrity Stylist • Curated Looks with Real Shop Links",
    description:
      "Drop a celeb, pick budget, shop the look. Real links. No dead ends.",
  },
};

/* --------------------------------- UI bits -------------------------------- */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/70 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

function CTA({
  href,
  children,
  variant = "dark",
  aria,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "dark" | "light" | "ghost";
  aria?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition";
  const style =
    variant === "dark"
      ? "bg-black text-white hover:opacity-90"
      : variant === "light"
      ? "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
      : "text-neutral-900 hover:underline";
  return (
    <Link href={href} aria-label={aria} className={`${base} ${style}`}>
      {children}
    </Link>
  );
}

function Card({
  title,
  children,
  eyebrow,
}: {
  title: string;
  children: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm">
      {eyebrow ? (
        <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {eyebrow}
        </div>
      ) : null}
      <h3 className="mt-1 text-base font-semibold text-neutral-900">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-neutral-700">{children}</div>
    </div>
  );
}

function Stat({
  value,
  label,
  footnote,
}: {
  value: React.ReactNode;
  label: string;
  footnote?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 text-center shadow-sm">
      <div className="text-3xl font-semibold tracking-tight text-neutral-900">
        {value}
      </div>
      <div className="mt-1 text-sm text-neutral-600">{label}</div>
      {footnote ? (
        <div className="mt-1 text-[11px] text-neutral-500">{footnote}</div>
      ) : null}
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function Page() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ===================== Structured Data for rich results ===================== */}
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
                "https://runwaytwin.vercel.app/stylist?q={search_term_string}",
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
                price: "19",
                priceCurrency: "EUR",
                url: "https://runwaytwin.vercel.app/pricing",
              },
              {
                "@type": "Offer",
                price: "5",
                priceCurrency: "EUR",
                url: "https://runwaytwin.vercel.app/pricing#one-off",
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
            "@type": "Organization",
            name: "RunwayTwin",
            url: "https://runwaytwin.vercel.app/",
            sameAs: [
              "https://www.instagram.com/yourhandle",
              "https://www.tiktok.com/@yourhandle",
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
                name: "Do links open real product pages?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes — we fetch live, in-stock items and deep-link to retailer product pages.",
                },
              },
              {
                "@type": "Question",
                name: "Will it suit my body type?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "We balance pear/hourglass/apple/rectangle for flattering silhouettes.",
                },
              },
              {
                "@type": "Question",
                name: "EU/US availability?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Country toggle adapts sizes, currencies, and retailer coverage.",
                },
              },
              {
                "@type": "Question",
                name: "Can I cancel any time?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. One-off €5 or Premium €19/month — pause or cancel whenever.",
                },
              },
            ],
          }),
        }}
      />

      {/* =============================== Announcement =============================== */}
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
          7-day money-back on Premium. Try a one-off look for €5 — upgrade anytime.
        </div>
      </div>

      {/* ================================== HERO =================================== */}
      <section className="relative">
        {/* soft editorial veils */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-6 pt-14 pb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>AI Vision</Badge>
            <Badge>Live Products</Badge>
            <Badge>Working Links</Badge>
            <Badge>EU/US Stock</Badge>
          </div>

          <h1 className="font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">
            Your Personal Celebrity Stylist —{" "}
            <span className="text-[hsl(27_65%_42%)]">instantly shoppable.</span>
          </h1>

          <p className="mt-5 max-w-3xl text-[15px] leading-7 text-neutral-700">
            Drop a celebrity photo or name, choose budget & occasion, and get a
            curated outfit that flatters your body type. With{" "}
            <span className="font-medium">real product links</span> from
            in-stock EU/US retailers. No dead ends. No guesswork. Just shop.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <CTA href="/stylist" aria="Start styling now">
              Start Styling
            </CTA>
            <CTA href="/pricing" variant="light" aria="See pricing">
              See Pricing
            </CTA>
            <CTA href="/blog" variant="light" aria="Read the guides">
              Style Guides
            </CTA>
          </div>

          {/* mini features */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Vision that “gets” your muse">
              Recognises the celebrity, then extracts palette, silhouette &
              signature cues to steer picks.
            </Card>
            <Card title="Live products that are in stock">
              Filters by price, colour & size across top retailers (EU/US) —
              refreshed continuously.
            </Card>
            <Card title="Links that actually open products">
              Affiliate-ready deep-links for zero drop-off and instant checkout.
            </Card>
          </div>

          {/* retailer strip */}
          <div className="mt-8 rounded-2xl border border-neutral-200/70 bg-white/70 p-4 text-xs shadow-sm">
            <div className="text-neutral-500">Retailers we love:</div>
            <div className="mt-2 flex flex-wrap gap-4 text-neutral-700">
              <span>Net-a-Porter</span>
              <span>Nordstrom</span>
              <span>Zara</span>
              <span>COS</span>
              <span>H&M</span>
              <span>Mango</span>
              <span>&amp; Other Stories</span>
            </div>
          </div>
        </div>
      </section>

      {/* =============================== Social Proof =============================== */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 rounded-xl border border-neutral-200 bg-white/70 px-5 py-3 text-[12px] text-neutral-500 shadow-sm">
          <span>As seen in</span>
          <span className="font-medium text-neutral-700">Vogue Tech</span>
          <span className="font-medium text-neutral-700">Harper’s Bazaar Lab</span>
          <span className="font-medium text-neutral-700">Product Hunt</span>
          <span className="font-medium text-neutral-700">Women in AI</span>
        </div>
      </section>

      {/* =============================== How It Works =============================== */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="1) Drop your muse">
            Upload a celeb photo or type a name with occasion & budget.
          </Card>
          <Card title="2) AI curates the look">
            Vision + text models decode palette, silhouette & body-type fit.
          </Card>
          <Card title="3) Shop instantly">
            Clean retailer links with optional affiliate tracking.
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat value="30k+" label="Looks generated" />
          <Stat value="18–32%" label="Buy-intent uplift (avg.)" />
          <Stat value="EU/US" label="Stock coverage" />
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="text-sm text-neutral-700">
            <span className="font-semibold">Unlock unlimited styling</span> — wardrobe plans, live feeds &
            priority coaching. Cancel anytime.
          </div>
          <div className="flex gap-3">
            <CTA href="/pricing">€19/month</CTA>
            <CTA href="/pricing#one-off" variant="light">
              One-off look €5
            </CTA>
          </div>
        </div>
      </section>

      {/* =============================== Value Props =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">Why RunwayTwin</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Made for real bodies">
            Our fit logic balances pear/hourglass/apple/rectangle so silhouettes flatter — not generic.
          </Card>
          <Card title="Links that actually open products">
            We deep-link to live product pages (affiliate optional).
          </Card>
          <Card title="EU/US aware">
            Toggle country; we adapt sizes, currency and retailer coverage.
          </Card>
          <Card title="Zero risk">
            7-day money-back on Premium. Try €5 one-off first.
          </Card>
        </div>
      </section>

      {/* =============================== Testimonials =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Loved by creators & shoppers</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <blockquote className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              “Typed ‘Zendaya, evening, mid budget’ and checked out in five minutes. Links actually worked!”
              <div className="mt-2 text-xs text-neutral-500">— Elise M.</div>
            </blockquote>
            <blockquote className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              “Body-type tips are spot on. Wide-leg + pointed flats = instant polish.”
              <div className="mt-2 text-xs text-neutral-500">— Tasha K.</div>
            </blockquote>
            <blockquote className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              “Cleanest affiliate flow we’ve tested. Zero broken links.”
              <div className="mt-2 text-xs text-neutral-500">— Retail Labs</div>
            </blockquote>
          </div>
        </div>
      </section>

      {/* =============================== Comparison =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">Why not hire a stylist?</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="p-5 text-sm">
              <div className="text-neutral-500">Traditional stylist</div>
              <div className="mt-2 text-neutral-900">€500–€1,000 / look</div>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>Manual sourcing</li>
                <li>Inconsistent availability</li>
                <li>Not scalable</li>
              </ul>
            </div>
            <div className="border-t border-neutral-200 p-5 text-sm md:border-l md:border-t-0">
              <div className="text-neutral-500">“Inspo” scrolling</div>
              <div className="mt-2 text-neutral-900">Time-intensive</div>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>Dead links & dupes</li>
                <li>No body-type logic</li>
                <li>Guesswork & returns</li>
              </ul>
            </div>
            <div className="border-t border-neutral-200 bg-neutral-50/60 p-5 text-sm md:border-l md:border-t-0">
              <div className="font-semibold">RunwayTwin</div>
              <div className="mt-2 text-neutral-900">€19/month or €5 one-off</div>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>AI curation from celeb signature</li>
                <li>Live, in-stock products</li>
                <li>Clean product deep-links</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <CTA href="/stylist">Try the Stylist</CTA>
          <CTA href="/pricing" variant="light">
            Go Premium
          </CTA>
        </div>
      </section>

      {/* =============================== Journal =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">From the Journal</h2>
          <Link
            className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
            href="/blog"
          >
            See all →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Dress Like Zendaya: Red-Carpet to Real Life">
            Her formula, colours, and shoppable pieces under €100.{" "}
            <Link
              className="text-neutral-900 underline"
              href="/blog/zendaya-evening-glam"
            >
              Read guide →
            </Link>
          </Card>
          <Card title="Rihanna Streetwear: The Exact Vibe (and Where to Buy)">
            Oversized outerwear, crop+wide leg, bold accessories — linked.{" "}
            <Link
              className="text-neutral-900 underline"
              href="/blog/rihanna-street-luxe"
            >
              Read guide →
            </Link>
          </Card>
          <Card title="Jennifer Lawrence Minimalism: Workwear Capsule">
            Neutral palette, sleek tailoring, pointed shoes.{" "}
            <Link
              className="text-neutral-900 underline"
              href="/blog/jennifer-lawrence-off-duty"
            >
              Read guide →
            </Link>
          </Card>
        </div>
      </section>

      {/* =============================== FAQ =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently asked</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Does it work with my body type?">
            Yes — we balance pear/hourglass/apple/rectangle for flattering silhouettes. You can also set personal fit preferences.
          </Card>
          <Card title="Do the links actually open products?">
            Absolutely. We fetch live, in-stock items and deep-link to the product page (affiliate optional).
          </Card>
          <Card title="EU/US availability?">
            Choose EU or US; we adapt sizes, currency and available retailers automatically.
          </Card>
          <Card title="Can I cancel any time?">
            Of course. One-off look for €5, or Premium for €19/month with a 7-day money-back guarantee.
          </Card>
        </div>
      </section>

      {/* =============================== Final CTA =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="text-lg font-semibold">Ready to style smarter?</div>
              <p className="mt-1 text-sm text-neutral-700">
                Turn inspiration into outfits you actually love — and actually buy.
              </p>
            </div>
            <div className="flex gap-3">
              <CTA href="/stylist">Start Styling</CTA>
              <CTA href="/pricing" variant="light">
                Go Premium
              </CTA>
            </div>
          </div>
        </div>
      </section>

      {/* =============================== Footer =============================== */}
      <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-1 gap-8 text-sm text-neutral-700 md:grid-cols-4">
            <div>
              <div className="font-semibold">RunwayTwin</div>
              <p className="mt-2 max-w-xs text-neutral-600">
                Celebrity stylist AI — curated looks with working shop links.
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                Disclosure: some outbound links are affiliate links; we may earn a
                commission at no extra cost to you.
              </p>
            </div>
            <div>
              <div className="font-semibold">Product</div>
              <ul className="mt-2 space-y-2">
                <li>
                  <Link className="hover:underline" href="/stylist">
                    Stylist
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" href="/pricing">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" href="/blog">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Company</div>
              <ul className="mt-2 space-y-2">
                <li>
                  <Link className="hover:underline" href="/about">
                    About
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" href="/contact">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Legal</div>
              <ul className="mt-2 space-y-2">
                <li>
                  <Link
                    className="hover:underline"
                    href="/affiliate-disclosure"
                  >
                    Affiliate Disclosure
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" href="/privacy">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" href="/terms">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 text-xs text-neutral-500">
            © {new Date().getFullYear()} RunwayTwin — All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

