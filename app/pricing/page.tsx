import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Pricing (Premium • SEO & CRO-Optimized • Server Component)
   ========================================================================= */

export const metadata: Metadata = {
  title: "Pricing — RunwayTwin │ Premium Stylist €19/mo or One-Off Look €5",
  description:
    "Start with a €5 one-off look or go Premium for €19/month. Unlimited stylings, capsule planning and live EU/US product feeds. 7-day money-back guarantee.",
  alternates: { canonical: "https://runwaytwin.vercel.app/pricing" },
  openGraph: {
    title: "Pricing — RunwayTwin │ Premium Stylist €19/mo or One-Off Look €5",
    description:
      "Choose a €5 one-off look to try it, or upgrade to Premium (€19/month) for unlimited stylings. 7-day money-back. Cancel anytime.",
    url: "https://runwaytwin.vercel.app/pricing",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — RunwayTwin │ Premium Stylist €19/mo or One-Off Look €5",
    description:
      "Risk-free: 7-day money-back on Premium. EU/US stock, body-type flattering looks, budget-true sourcing.",
  },
};

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

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
      <span className="text-sm text-neutral-700">{children}</span>
    </li>
  );
}

function Plan({
  name,
  price,
  period,
  highlight = false,
  ctaHref,
  ctaLabel,
  features,
  id,
}: {
  name: string;
  price: string;
  period?: string;
  highlight?: boolean;
  ctaHref: string;
  ctaLabel: string;
  features: string[];
  id?: string;
}) {
  return (
    <article
      id={id}
      className={`rounded-2xl border p-6 shadow-sm ${
        highlight
          ? "border-neutral-900 bg-white"
          : "border-neutral-200/70 bg-white/80"
      }`}
    >
      {highlight ? (
        <p className="mb-2 inline-flex items-center rounded-full border border-neutral-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide">
          Most Popular
        </p>
      ) : (
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          Flexible
        </span>
      )}

      <h2 className="text-lg font-semibold tracking-tight">{name}</h2>

      <div className="mt-3 flex items-baseline gap-1">
        <div className="text-3xl font-semibold">{price}</div>
        {period ? (
          <div className="text-sm text-neutral-600">{period}</div>
        ) : null}
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
    </article>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* JSON-LD: Product & FAQ */}
      <script
        type="application/ld+json"
        // Product
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
        // FAQ
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

      {/* Header block */}
      <section className="mx-auto max-w-6xl px-5 pt-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
              Simple plans.{" "}
              <span className="text-[hsl(27_65%_42%)]">Risk-free.</span>
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
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Plan
            name="Premium Stylist"
            price="€19"
            period="/month"
            highlight
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
          />

          <Plan
            id="one-off"
            name="One-Off Look"
            price="€5"
            period={undefined}
            ctaHref="/stylist"
            ctaLabel="Try One-Off"
            features={[
              "Single curated styling session",
              "Fits your body type & budget",
              "EU/US product links",
              "No subscription required",
            ]}
          />
        </div>

        {/* Trust grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Secure payments</p>
            <p className="mt-1 text-sm text-neutral-700">
              Handled by Stripe. Apple Pay & major cards supported.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Cancel anytime</p>
            <p className="mt-1 text-sm text-neutral-700">
              No lock-in. Pause or cancel with one click.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Affiliate-ready</p>
            <p className="mt-1 text-sm text-neutral-700">
              Creators can connect a redirect prefix to monetize every click.
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">What you get</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Editor-level curation</p>
            <p className="mt-1 text-sm text-neutral-700">
              Celebrity signatures distilled into outfits that feel intentional,
              modern and wearable.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Body-type flattering</p>
            <p className="mt-1 text-sm text-neutral-700">
              Pear, hourglass, apple or rectangle — silhouettes tuned to flatter.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">Budget-true sourcing</p>
            <p className="mt-1 text-sm text-neutral-700">
              Pick high-street, mid or luxury; we stay strictly within your band.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold">EU/US live stock</p>
            <p className="mt-1 text-sm text-neutral-700">
              Local currency & retailers, updated continuously.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
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
            <h3 className="text-base font-semibold">
              What’s included with Premium?
            </h3>
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

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">
                Look expensive — spend smart.
              </p>
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
    </main>
  );
}


