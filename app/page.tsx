import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Homepage (Editorial Premium • Shopper-first Value)
   - Server Component only (no client hooks)
   - USPs: Editorial taste, body-type flattering, budget-certainty,
           capsule-friendly, time-saving, EU/US stock
   - SEO: Rich metadata + JSON-LD (WebSite, Product, FAQ, Organization)
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "RunwayTwin — AI Celebrity Stylist • Editorial Looks, Body-Type Flattering, Under-Your-Budget",
  description:
    "Upload a celeb photo or name, set your budget & occasion, and get an editorial-grade outfit in minutes. Smart fit logic for real bodies. EU/US stock.",
  alternates: { canonical: "https://runwaytwin.vercel.app/" },
  keywords: [
    "AI stylist",
    "celebrity outfit",
    "dress like zendaya",
    "rihanna streetwear",
    "personal stylist AI",
    "outfit generator",
    "capsule wardrobe",
    "body type styling",
    "elevated basics",
  ],
  openGraph: {
    title:
      "RunwayTwin — AI Celebrity Stylist • Editorial Looks, Body-Type Flattering, Under-Your-Budget",
    description:
      "Turn celebrity inspiration into outfits you actually wear. Editorial taste, live EU/US products, and smart fit for real bodies.",
    url: "https://runwaytwin.vercel.app/",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "RunwayTwin — AI Celebrity Stylist • Editorial Looks, Body-Type Flattering, Under-Your-Budget",
    description:
      "From celeb to cart in minutes. Capsule-friendly picks, tailored to your body and budget.",
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

function Pill({
  title,
  body,
}: {
  title: string | React.ReactNode;
  body: string | React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm text-center">
      <div className="text-xl font-semibold tracking-tight text-neutral-900">
        {title}
      </div>
      <div className="mt-1 text-sm text-neutral-600">{body}</div>
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
              "Unlimited AI stylings, capsule planning and live EU/US products — all tailored to your budget and body type.",
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
                name: "Will it suit my body type?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes — our fit logic balances pear/hourglass/apple/rectangle for flattering silhouettes. You can set your usual sizes and fit preference.",
                },
              },
              {
                "@type": "Question",
                name: "Can I keep to my budget?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Absolutely. Choose high-street, mid or luxury and we curate picks within that price band — no surprises at checkout.",
                },
              },
              {
                "@type": "Question",
                name: "Does it support EU/US?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Toggle EU or US; we adapt sizes, currency and retailer availability automatically.",
                },
              },
              {
                "@type": "Question",
                name: "How do I try it risk-free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Start with a €5 one-off look, or go Premium for €19/month with a 7-day money-back guarantee.",
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
          Concierge feel, instant results — 7-day money-back on Premium.
        </div>
      </div>

      {/* ================================== HERO =================================== */}
      <section className="relative">
        {/* soft editorial light */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-6 pt-14 pb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>AI Vision</Badge>
            <Badge>Editorial Taste</Badge>
            <Badge>Live EU/US Products</Badge>
            <Badge>Capsule-Friendly</Badge>
          </div>

          <h1 className="font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">
            Your Personal Celebrity Stylist —{" "}
            <span className="text-[hsl(27_65%_42%)]">instantly elevated.</span>
          </h1>

          <p className="mt-5 max-w-3xl text-[15px] leading-7 text-neutral-700">
            Drop a celeb photo or name, choose budget & occasion, and receive an{" "}
            <span className="font-medium">editorial-grade</span> outfit that
            flatters your body type — in minutes. We keep it{" "}
            <span className="font-medium">within your budget</span> and{" "}
            <span className="font-medium">in your size</span>, sourced from live
            EU/US stock.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <CTA href="/stylist" aria="Start styling now">
              Start Styling
            </CTA>
            <CTA href="/pricing" variant="light" aria="See pricing">
              See Pricing
            </CTA>
            <CTA href="/blog" variant="light" aria="Read the style guides">
              Style Guides
            </CTA>
          </div>

          {/* mini features (refined USPs) */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Taste you can trust">
              Our models are trained on celebrity signature cues, then refined
              with editorial rules — the difference between “inspired” and
              “effortless”.
            </Card>
            <Card title="Flattering by design">
              Body-type logic shapes every suggestion — silhouette, rise, hem,
              and proportions tuned to you.
            </Card>
            <Card title="Budget certainty">
              Choose high-street, mid or luxury; we curate within the band so
              your cart won’t surprise you.
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
              <span>H&amp;M</span>
              <span>Mango</span>
              <span>&amp; Other Stories</span>
            </div>
          </div>
        </div>
      </section>

      {/* =============================== Shopper-first Benefits ===================== */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Made for real life</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Pill title="2–5 minute results" body="From muse to cart, fast." />
          <Pill title="Under-your-budget picks" body="High-street, mid or luxury." />
          <Pill title="Body-type flattering" body="Pear, hourglass, apple, rectangle." />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Pill title="EU/US stock" body="Live availability in your currency." />
          <Pill title="Capsule-friendly" body="Pieces that work hard in your wardrobe." />
          <Pill title="Occasion ready" body="Everyday, evening, work, travel." />
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div className="text-sm text-neutral-700">
            <span className="font-semibold">Start with a one-off</span> for €5 — upgrade to{" "}
            <span className="font-semibold">Premium (€19/month)</span> when you love it. 7-day money-back.
          </div>
          <div className="flex gap-3">
            <CTA href="/stylist">Try Now</CTA>
            <CTA href="/pricing" variant="light">
              See Plans
            </CTA>
          </div>
        </div>
      </section>

      {/* =============================== Why RunwayTwin ============================ */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">Why RunwayTwin</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Editor-level curation">
            Signature palettes, finishing touches and styling rules that make a look feel intentional — not random.
          </Card>
          <Card title="Fits your life (and budget)">
            You set the brief; we deliver cohesive looks that respect your price band and your calendar.
          </Card>
          <Card title="Capsule-first thinking">
            Keep your staples. We fill the gaps with pieces that mix & match and get worn on repeat.
          </Card>
          <Card title="Zero fuss guarantee">
            Try a €5 one-off first. Premium comes with a 7-day money-back promise.
          </Card>
        </div>
      </section>

      {/* =============================== Testimonials ============================= */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">What clients say</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <blockquote className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              “From ‘Zendaya, evening, mid budget’ to checkout in minutes. Looked expensive — wasn’t.”
              <div className="mt-2 text-xs text-neutral-500">— Elise M.</div>
            </blockquote>
            <blockquote className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              “The body-type advice is unreal. I finally understand why certain trousers work on me.”
              <div className="mt-2 text-xs text-neutral-500">— Tasha K.</div>
            </blockquote>
            <blockquote className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              “I stopped doom-scrolling and actually built a capsule I wear. Worth it.”
              <div className="mt-2 text-xs text-neutral-500">— Mira S.</div>
            </blockquote>
          </div>
        </div>
      </section>

      {/* =============================== Comparison =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">Smarter than scrolling</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="p-5 text-sm">
              <div className="text-neutral-500">Endless scrolling</div>
              <div className="mt-2 text-neutral-900">Time-intensive</div>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>Random inspo, no cohesion</li>
                <li>No body-type logic</li>
                <li>Returns & regret buys</li>
              </ul>
            </div>
            <div className="border-t border-neutral-200 p-5 text-sm md:border-l md:border-t-0">
              <div className="text-neutral-500">Personal shoppers</div>
              <div className="mt-2 text-neutral-900">€500–€1,000 / look</div>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>Manual sourcing</li>
                <li>Limited availability</li>
                <li>High commitment</li>
              </ul>
            </div>
            <div className="border-t border-neutral-200 bg-neutral-50/60 p-5 text-sm md:border-l md:border-t-0">
              <div className="font-semibold">RunwayTwin</div>
              <div className="mt-2 text-neutral-900">€19/month or €5 one-off</div>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>Editorial curation from celeb signature</li>
                <li>Live EU/US products in your size</li>
                <li>Capsule-friendly, budget-true</li>
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
          <Card title="Will it suit my body type?">
            Yes — we balance pear/hourglass/apple/rectangle so silhouettes flatter. You can also set fit preferences and usual sizes.
          </Card>
          <Card title="Can I keep to my budget?">
            Choose high-street, mid or luxury; we curate within your band — no surprises.
          </Card>
          <Card title="Is stock live for my region?">
            Yes. EU/US coverage with sizes, currency and retailers adapted automatically.
          </Card>
          <Card title="Can I cancel any time?">
            Of course. Try a €5 one-off, or go Premium for €19/month with a 7-day money-back guarantee.
          </Card>
        </div>
      </section>

      {/* =============================== Final CTA =============================== */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="text-lg font-semibold">Look expensive — spend smart.</div>
              <p className="mt-1 text-sm text-neutral-700">
                The fastest way from celebrity inspiration to outfits you actually wear.
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
                Celebrity stylist AI — editorial looks, budget-true picks, live EU/US stock.
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

