// app/pricing/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* =============================================================================
   RunwayTwin — Pricing (Ultra-Premium • SEO + CRO • Mobile-First)
   - Server Component only (no client hooks)
   - Uses global sticky header & footer from app/layout.tsx (no local header/footer)
   - Sections: Hero, Plans, Value Stack, Comparison, Guarantee, Press,
     Testimonials, FAQs, Final CTA
   - JSON-LD: Product + FAQ for enhanced search visibility
   - TailwindCSS expected
   ============================================================================= */

export const metadata: Metadata = {
  title: "Pricing — RunwayTwin │ Premium AI Stylist €19/mo or One-Off Look €5",
  description:
    "Try a one-off curated look for €5 or go Premium for €19/month. Unlimited stylings, capsule planning, and live EU/US product links tailored to your body and budget. 7-day money-back.",
  alternates: { canonical: "https://runwaytwin.vercel.app/pricing" },
  keywords: [
    "AI stylist pricing",
    "celebrity stylist app",
    "personal stylist subscription",
    "outfit generator cost",
    "capsule wardrobe service",
    "dress like a celebrity",
  ],
  openGraph: {
    title:
      "Pricing — RunwayTwin │ Premium AI Stylist €19/mo or One-Off Look €5",
    description:
      "Start with a €5 one-off look or upgrade to Premium (€19/month) for unlimited stylings. Editorial curation, body-type flattering, EU/US live stock.",
    url: "https://runwaytwin.vercel.app/pricing",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Pricing — RunwayTwin │ Premium AI Stylist €19/mo or One-Off Look €5",
    description:
      "Risk-free: 7-day money-back on Premium. Capsule planning, budget-true sourcing, EU/US availability.",
  },
  icons: { icon: "/favicon.ico" },
};

/* --------------------------------- UI atoms -------------------------------- */

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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
      <span className="text-sm text-neutral-700">{children}</span>
    </li>
  );
}

/* ------------------------------- Complex atoms ----------------------------- */

function Plan({
  name,
  price,
  period,
  highlight = false,
  ctaHref,
  ctaLabel,
  features,
  id,
  ribbon,
  footnote,
}: {
  name: string;
  price: string;
  period?: string;
  highlight?: boolean;
  ctaHref: string;
  ctaLabel: string;
  features: string[];
  id?: string;
  ribbon?: string;
  footnote?: string;
}) {
  return (
    <article
      id={id}
      className={`relative rounded-2xl border p-6 shadow-sm ${
        highlight
          ? "border-neutral-900 bg-white"
          : "border-neutral-200/70 bg-white/90"
      }`}
    >
      {ribbon ? (
        <div className="absolute -top-3 right-4">
          <span className="rounded-full border border-neutral-900 bg-black px-3 py-1 text-[11px] font-semibold text-white">
            {ribbon}
          </span>
        </div>
      ) : null}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
          <div className="mt-2 flex items-baseline gap-1">
            <div className="text-4xl font-semibold tracking-tight">{price}</div>
            {period ? (
              <div className="text-sm text-neutral-600">{period}</div>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {features.map((f, i) => (
          <Check key={i}>{f}</Check>
        ))}
      </ul>

      <div className="mt-6">
        <CTA href={ctaHref} variant={highlight ? "dark" : "light"}>
          {ctaLabel}
        </CTA>
      </div>

      {footnote ? (
        <p className="mt-3 text-[12px] leading-5 text-neutral-500">{footnote}</p>
      ) : null}
    </article>
  );
}

function ValueCard({
  title,
  body,
}: {
  title: string;
  body: string | React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-neutral-700">{body}</p>
    </article>
  );
}

/* --------------------------------- Page body -------------------------------- */

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ----------------------- JSON-LD: Product & FAQ ----------------------- */}
      <script
        type="application/ld+json"
        // Product schema with two offers
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "RunwayTwin Premium Stylist",
            description:
              "Unlimited AI stylings, capsule planning and live EU/US products — tailored to body type and budget.",
            brand: { "@type": "Brand", name: "RunwayTwin" },
            offers: [
              {
                "@type": "Offer",
                price: "19",
                priceCurrency: "EUR",
                priceValidUntil: "2030-01-01",
                url: "https://runwaytwin.vercel.app/pricing",
                category: "subscription",
              },
              {
                "@type": "Offer",
                price: "5",
                priceCurrency: "EUR",
                url: "https://runwaytwin.vercel.app/pricing#one-off",
                category: "service",
              },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        // FAQ schema
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Can I try it once before subscribing?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes — get a one-off curated look for €5, then upgrade to Premium anytime for unlimited stylings.",
                },
              },
              {
                "@type": "Question",
                name: "Is there a money-back guarantee?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Premium comes with a 7-day money-back guarantee. If it’s not for you, we’ll refund the first month.",
                },
              },
              {
                "@type": "Question",
                name: "Will recommendations fit my body type and budget?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes — our logic balances pear/hourglass/apple/rectangle silhouettes and curates strictly within your chosen budget band.",
                },
              },
              {
                "@type": "Question",
                name: "Is EU/US stock supported?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Toggle your region and we adapt sizes, currency and retailers to EU/US with live availability.",
                },
              },
            ],
          }),
        }}
      />

      {/* -------- Uses global header from app/layout.tsx (no local header here) ------- */}

      {/* --------------------------------- Hero --------------------------------- */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge>Editorial Taste</Badge>
            <Badge>Body-Type Flattering</Badge>
            <Badge>Budget-True</Badge>
            <Badge>EU/US Stock</Badge>
            <Badge>Capsule-Friendly</Badge>
          </div>

          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
                Simple plans. <span className="text-[hsl(27_65%_42%)]">Risk-free.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-neutral-700">
                Start with a one-off curated look for €5 — upgrade to Premium for
                unlimited stylings, capsule planning and live EU/US product feeds.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] text-emerald-900">
              7-day money-back on Premium • Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- Plans --------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Plan
            name="Premium Stylist"
            price="€19"
            period="/month"
            highlight
            ribbon="Most Popular"
            ctaHref="/stylist"
            ctaLabel="Go Premium"
            features={[
              "Unlimited stylings & refreshes",
              "Capsule planning, wardrobe edits",
              "Live EU/US products in your size",
              "Occasion-ready: everyday, work, travel, evening",
              "Priority styling & email support",
              "7-day money-back guarantee",
            ]}
            footnote="Perfect for regular refreshes, seasonal capsules, and event dressing."
          />

          <Plan
            id="one-off"
            name="One-Off Look"
            price="€5"
            ctaHref="/stylist"
            ctaLabel="Try One-Off"
            features={[
              "Single curated styling session",
              "Fits your body type & budget",
              "EU/US product links",
              "No subscription required",
            ]}
            footnote="A great taste of the experience — upgrade anytime."
          />
        </div>
      </section>

      {/* ------------------------------ Value stack ------------------------------ */
      }
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">What you get</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ValueCard
            title="Editor-level curation"
            body="Celebrity signatures distilled into outfits that feel intentional, modern, and wearable — the difference between ‘inspired’ and ‘effortless’."
          />
          <ValueCard
            title="Body-type flattering"
            body="Pear, hourglass, apple or rectangle — silhouettes, rises and lengths tuned to flatter your proportions."
          />
          <ValueCard
            title="Budget-true sourcing"
            body="Pick high-street, mid or luxury; we curate strictly within your band so your total never surprises you."
          />
          <ValueCard
            title="EU/US live stock"
            body="Local retailers and currency with in-stock items, refreshed continuously."
          />
        </div>
      </section>

      {/* ------------------------------ Comparison ------------------------------ */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">Compare options</h2>
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
      </section>

      {/* ------------------------------ Guarantee ------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:flex-row md:items-center">
          <div>
            <p className="text-lg font-semibold">7-day money-back guarantee</p>
            <p className="mt-1 text-sm text-emerald-900">
              Try Premium for a week — if it’s not for you, we’ll refund your first month.
            </p>
          </div>
          <CTA href="/stylist" variant="light">
            Start Premium
          </CTA>
        </div>
      </section>

      {/* --------------------------------- Press --------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 rounded-xl border border-neutral-200 bg-white/70 px-5 py-3 text-[12px] text-neutral-500 shadow-sm">
          <span>As seen in</span>
          <span className="font-medium text-neutral-700">Vogue Tech</span>
          <span className="font-medium text-neutral-700">Harper’s Bazaar Lab</span>
          <span className="font-medium text-neutral-700">Product Hunt</span>
          <span className="font-medium text-neutral-700">Women in AI</span>
        </div>
      </section>

      {/* ------------------------------ Testimonials ---------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="sr-only">Testimonials</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <figure className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <blockquote className="text-sm text-neutral-700">
              “From ‘Zendaya, evening, mid budget’ to checkout in minutes. Looked
              expensive — wasn’t.”
            </blockquote>
            <figcaption className="mt-2 text-xs text-neutral-500">— Elise M.</figcaption>
          </figure>
          <figure className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <blockquote className="text-sm text-neutral-700">
              “The body-type advice is unreal. I finally understand which trousers
              love me back.”
            </blockquote>
            <figcaption className="mt-2 text-xs text-neutral-500">— Tasha K.</figcaption>
          </figure>
          <figure className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <blockquote className="text-sm text-neutral-700">
              “I stopped doom-scrolling and actually built a capsule I wear. Worth it.”
            </blockquote>
            <figcaption className="mt-2 text-xs text-neutral-500">— Mira S.</figcaption>
          </figure>
        </div>
      </section>

      {/* ---------------------------------- FAQ ---------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">Can I try it first?</h3>
            <p className="mt-2 text-sm text-neutral-700">
              Yes — get a one-off curated look for €5. Upgrade to Premium anytime
              for unlimited stylings.
            </p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">What’s included with Premium?</h3>
            <p className="mt-2 text-sm text-neutral-700">
              Unlimited stylings, capsule planning, wardrobe edits, live EU/US
              products in your size, and priority support — all within your budget.
            </p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">Is there a guarantee?</h3>
            <p className="mt-2 text-sm text-neutral-700">
              Premium includes a 7-day money-back guarantee. If it’s not a fit, we’ll
              refund your first month.
            </p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold">Do you support EU/US?</h3>
            <p className="mt-2 text-sm text-neutral-700">
              Yes. Toggle your region; we adapt sizes, currency and retailers with
              live availability.
            </p>
          </article>
        </div>
      </section>

      {/* -------------------------------- Final CTA ------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Look expensive — spend smart.</p>
              <p className="mt-1 text-sm text-neutral-700">
                Try a €5 one-off look or go Premium for €19/month. Cancel anytime.
              </p>
            </div>
            <div className="flex gap-3">
              <CTA href="/stylist">Start Styling</CTA>
              <CTA href="/stylist" variant="light">
                Try One-Off
              </CTA>
            </div>
          </div>
        </div>
      </section>

      {/* -------- Uses global footer from app/layout.tsx (no local footer here) ------- */}
    </main>
  );
}


