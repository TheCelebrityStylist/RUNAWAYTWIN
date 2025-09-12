import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Homepage (Ultra-Premium • Mobile-First • SEO & CRO perfected)
   - Server Component only (no client hooks — safe for Vercel builds)
   - Tailored value props, persuasive copy, and strong visual hierarchy
   - JSON-LD: WebSite, Product, FAQ, Organization, Breadcrumb
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "RunwayTwin — AI Celebrity Stylist │ Editorial Looks, Body-Type Flattering, Budget-True",
  description:
    "Turn celebrity inspiration into outfits you actually wear. Upload a celeb photo or name, set budget & occasion, and get an editorial-grade look in minutes — tailored to your body type with EU/US stock.",
  alternates: { canonical: "https://runwaytwin.vercel.app/" },
  keywords: [
    "AI stylist",
    "celebrity stylist",
    "dress like Zendaya",
    "Rihanna outfit",
    "capsule wardrobe AI",
    "personal stylist online",
    "outfit generator",
    "body type styling",
    "affordable luxury outfits",
    "high street fashion outfits",
  ],
  openGraph: {
    title:
      "RunwayTwin — AI Celebrity Stylist │ Editorial Looks, Body-Type Flattering, Budget-True",
    description:
      "From celeb to cart in minutes. Editorial taste, capsule-friendly picks, EU/US stock — always within your budget.",
    url: "https://runwaytwin.vercel.app/",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "RunwayTwin — AI Celebrity Stylist │ Editorial Looks, Body-Type Flattering, Budget-True",
    description:
      "Upload a muse, choose your budget, and shop a refined outfit that flatters. EU/US stock. 7-day money-back on Premium.",
  },
  icons: { icon: "/favicon.ico" },
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
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20";
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
    <article className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm">
      {eyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-1 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{children}</p>
    </article>
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
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-6 text-center shadow-sm">
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
      {/* ============================ JSON-LD (rich results) ============================ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://runwaytwin.vercel.app/",
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
              "Unlimited AI stylings, capsule planning and live EU/US products — tailored to your body type and budget.",
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
                  text: "Yes — our fit logic balances pear/hourglass/apple/rectangle so silhouettes flatter. Set your usual sizes and fit preference for precision.",
                },
              },
              {
                "@type": "Question",
                name: "How do I stay within budget?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Choose high-street, mid or luxury. We curate strictly within your band — no surprise totals.",
                },
              },
              {
                "@type": "Question",
                name: "Is stock live for EU/US?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Toggle region; sizes, currency and retailers update automatically for EU/US.",
                },
              },
              {
                "@type": "Question",
                name: "Can I try it risk-free?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Start with a €5 one-off look or go Premium for €19/month with a 7-day money-back guarantee.",
                },
              },
            ],
          }),
        }}
      />

      {/* ============================ Announcement (trust) ============================ */}
      <div className="mx-auto max-w-6xl px-5 pt-4">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] text-emerald-900">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          7-day money-back on Premium • One-off look for €5 • Cancel anytime
        </div>
      </div>

      {/* ================================== HERO =================================== */}
      <section aria-labelledby="hero-title" className="relative">
        {/* elevated, subtle gradient for luxury feel */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>Editorial Taste</Badge>
            <Badge>Body-Type Flattering</Badge>
            <Badge>Budget-True</Badge>
            <Badge>EU/US Stock</Badge>
            <Badge>Capsule-Friendly</Badge>
          </div>

          <h1
            id="hero-title"
            className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px] md:text-[56px]"
          >
            Your Personal Celebrity Stylist —{" "}
            <span className="text-[hsl(27_65%_42%)]">instantly elevated.</span>
          </h1>

          <p className="mt-5 max-w-3xl text-[15px] leading-7 text-neutral-700">
            Upload a celeb photo or name, choose budget & occasion, and receive
            an <span className="font-medium">editorial-grade</span> outfit that
            flatters your silhouette — in minutes. We keep it{" "}
            <span className="font-medium">within your budget</span> and{" "}
            <span className="font-medium">in your size</span>, sourced from live
            EU/US stock.
          </p>

          <nav aria-label="Primary calls to action" className="mt-7">
            <ul className="flex flex-wrap items-center gap-3">
              <li>
                <CTA href="/stylist" aria="Start styling now">
                  Start Styling
                </CTA>
              </li>
              <li>
                <CTA href="/pricing" variant="light" aria="See pricing">
                  See Pricing
                </CTA>
              </li>
              <li>
                <CTA href="/blog" variant="light" aria="Read the style guides">
                  Style Guides
                </CTA>
              </li>
            </ul>
          </nav>

          {/* proof-driven mini cards */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Taste you can trust">
              Trained on celebrity signatures, refined with editor rules — that
              “how is this so right?” finish.
            </Card>
            <Card title="Flattering by design">
              Smart silhouette logic for pear, hourglass, apple and rectangle —
              proportions tuned to your body.
            </Card>
            <Card title="Budget certainty">
              Pick high-street, mid or luxury. We stay in-band — your cart won’t
              surprise you.
            </Card>
          </div>

          {/* retailers */}
          <div className="mt-8 rounded-2xl border border-neutral-200/70 bg-white/70 p-4 text-xs shadow-sm">
            <p className="text-neutral-500">Retailers we love:</p>
            <p className="mt-2 flex flex-wrap gap-4 text-neutral-700">
              <span>Net-a-Porter</span>
              <span>Nordstrom</span>
              <span>Zara</span>
              <span>COS</span>
              <span>H&amp;M</span>
              <span>Mango</span>
              <span>&amp; Other Stories</span>
            </p>
          </div>
        </div>
      </section>

      {/* ========================= Shopper-First Benefits ========================= */}
      <section aria-labelledby="benefits-title" className="mx-auto max-w-6xl px-5 py-12">
        <h2 id="benefits-title" className="text-2xl font-semibold tracking-tight">
          Made for real life
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Pill title="2–5 minute results" body="From muse to cart, fast." />
          <Pill title="Under-your-budget picks" body="High-street, mid or luxury." />
          <Pill title="Body-type flattering" body="Pear / Hourglass / Apple / Rectangle." />
          <Pill title="EU/US stock" body="Live availability, local currency." />
          <Pill title="Capsule-friendly" body="Buy pieces you’ll wear on repeat." />
          <Pill title="Occasion-ready" body="Everyday, evening, work, travel." />
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <p className="max-w-2xl text-sm text-neutral-700">
            <span className="font-semibold">Start with a one-off</span> for €5 — upgrade to{" "}
            <span className="font-semibold">Premium (€19/month)</span> when you love it. 7-day money-back.
          </p>
          <div className="flex gap-3">
            <CTA href="/stylist">Try Now</CTA>
            <CTA href="/pricing" variant="light">
              See Plans
            </CTA>
          </div>
        </div>
      </section>

      {/* ============================== Why RunwayTwin ============================= */}
      <section aria-labelledby="why-title" className="mx-auto max-w-6xl px-5 pb-12">
        <h2 id="why-title" className="text-2xl font-semibold tracking-tight">
          Why RunwayTwin
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Editor-level curation">
            Signature palettes and finishing touches that make outfits feel
            intentional — never random.
          </Card>
          <Card title="Fits your life (and budget)">
            You set the brief; we deliver cohesive looks that respect your price
            band and your calendar.
          </Card>
          <Card title="Capsule-first thinking">
            Keep your staples. We fill the gaps with mix-and-match pieces you’ll
            wear on repeat.
          </Card>
          <Card title="Zero-fuss guarantee">
            Try a €5 one-off first. Premium includes a 7-day money-back promise.
          </Card>
        </div>
      </section>

      {/* =============================== Social Proof ============================== */}
      <section aria-labelledby="testimonials-title" className="mx-auto max-w-6xl px-5 pb-10">
        <h2 id="testimonials-title" className="sr-only">
          Testimonials
        </h2>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <figure className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              <blockquote>
                “From ‘Zendaya, evening, mid budget’ to checkout in minutes. Looked
                expensive — wasn’t.”
              </blockquote>
              <figcaption className="mt-2 text-xs text-neutral-500">— Elise M.</figcaption>
            </figure>
            <figure className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              <blockquote>
                “The body-type advice is unreal. I finally understand which trousers
                love me back.”
              </blockquote>
              <figcaption className="mt-2 text-xs text-neutral-500">— Tasha K.</figcaption>
            </figure>
            <figure className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              <blockquote>
                “Less scrolling, more wearing. Built a capsule I actually use.”
              </blockquote>
              <figcaption className="mt-2 text-xs text-neutral-500">— Mira S.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ============================== Comparison for CRO ========================== */}
      <section aria-labelledby="compare-title" className="mx-auto max-w-6xl px-5 pb-14">
        <h2 id="compare-title" className="text-2xl font-semibold tracking-tight">
          Smarter than scrolling
        </h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="p-5 text-sm">
              <p className="text-neutral-500">Endless scrolling</p>
              <p className="mt-2 font-medium text-neutral-900">Time-intensive</p>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>Random inspo, no cohesion</li>
                <li>No body-type logic</li>
                <li>Returns & regret buys</li>
              </ul>
            </div>
            <div className="border-t border-neutral-200 p-5 text-sm md:border-l md:border-t-0">
              <p className="text-neutral-500">Personal shoppers</p>
              <p className="mt-2 font-medium text-neutral-900">€500–€1,000 / look</p>
              <ul className="mt-2 list-disc pl-5 text-neutral-700">
                <li>Manual sourcing</li>
                <li>Limited availability</li>
                <li>High commitment</li>
              </ul>
            </div>
            <div className="border-t border-neutral-200 bg-neutral-50/60 p-5 text-sm md:border-l md:border-t-0">
              <p className="font-semibold">RunwayTwin</p>
              <p className="mt-2 font-medium text-neutral-900">€19/month or €5 one-off</p>
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

      {/* ================================ Journal ================================= */}
      <section aria-labelledby="journal-title" className="mx-auto max-w-6xl px-5 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="journal-title" className="text-2xl font-semibold tracking-tight">
            From the Journal
          </h2>
          <Link
            className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
            href="/blog"
            aria-label="See all style guides"
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

      {/* ================================== FAQ =================================== */}
      <section aria-labelledby="faq-title" className="mx-auto max-w-6xl px-5 pb-16">
        <h2 id="faq-title" className="text-2xl font-semibold tracking-tight">
          Frequently asked
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Will it suit my body type?">
            Yes — we balance pear/hourglass/apple/rectangle so silhouettes
            flatter. Set your sizes and fit preference for best results.
          </Card>
          <Card title="Can I keep to my budget?">
            Choose high-street, mid or luxury; we curate within your band —
            no surprises at checkout.
          </Card>
          <Card title="Is stock live for my region?">
            Yes. EU/US coverage with sizes, currency and retailers adapted
            automatically to your region.
          </Card>
          <Card title="Can I cancel any time?">
            Absolutely. Try a €5 one-off look first, or go Premium for
            €19/month with a 7-day money-back guarantee.
          </Card>
        </div>
      </section>

      {/* ================================ Final CTA ================================ */}
      <section aria-labelledby="final-cta" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 id="final-cta" className="sr-only">
          Start styling now
        </h2>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Look expensive — spend smart.</p>
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

      {/* ================================== Footer ================================= */}
      <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="grid grid-cols-1 gap-8 text-sm text-neutral-700 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <p className="font-semibold">RunwayTwin</p>
              <p className="mt-2 max-w-xs text-neutral-600">
                Celebrity stylist AI — editorial looks, budget-true picks, live EU/US stock.
              </p>
              <p className="mt-3 text-[12px] leading-5 text-neutral-500">
                Disclosure: some outbound links are affiliate links; we may earn a
                commission at no extra cost to you.
              </p>
            </div>
            <nav aria-label="Product">
              <p className="font-semibold">Product</p>
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
            </nav>
            <nav aria-label="Company">
              <p className="font-semibold">Company</p>
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
            </nav>
            <nav aria-label="Legal">
              <p className="font-semibold">Legal</p>
              <ul className="mt-2 space-y-2">
                <li>
                  <Link className="hover:underline" href="/affiliate-disclosure">
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
            </nav>
          </div>
          <p className="mt-8 text-xs text-neutral-500">
            © {new Date().getFullYear()} RunwayTwin — All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}


