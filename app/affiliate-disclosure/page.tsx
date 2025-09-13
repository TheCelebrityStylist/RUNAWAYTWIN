// app/affiliate-disclosure/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* =============================================================================
   RunwayTwin — Affiliate Disclosure (SEO + Compliance • Server Component)
   - Uses global sticky header & footer from app/layout.tsx (no local header/footer)
   - Clear, human copy + compliant disclosures
   - JSON-LD: AboutPage + Breadcrumb for rich results
   - TailwindCSS expected
   ============================================================================= */

export const metadata: Metadata = {
  title: "Affiliate Disclosure — RunwayTwin",
  description:
    "Some outbound retailer links on RunwayTwin are affiliate links. If you purchase through them, we may earn a small commission at no extra cost to you. Taste and curation remain independent.",
  alternates: { canonical: "https://runwaytwin.vercel.app/affiliate-disclosure" },
  openGraph: {
    title: "Affiliate Disclosure — RunwayTwin",
    description:
      "We may earn a small commission on some retailer links, at no extra cost to you. Our styling choices remain independent.",
    url: "https://runwaytwin.vercel.app/affiliate-disclosure",
    siteName: "RunwayTwin",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Affiliate Disclosure — RunwayTwin",
    description:
      "Some retailer links are affiliate links. Commissions never influence our styling choices.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ============================ JSON-LD (rich results) ============================ */}
      <script
        type="application/ld+json"
        // AboutPage + Breadcrumb
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "Affiliate Disclosure",
            url: "https://runwaytwin.vercel.app/affiliate-disclosure",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://runwaytwin.vercel.app/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Affiliate Disclosure",
                  item: "https://runwaytwin.vercel.app/affiliate-disclosure",
                },
              ],
            },
            description:
              "RunwayTwin may earn a commission on qualifying purchases made through affiliate links, at no extra cost to you.",
          }),
        }}
      />

      {/* ================================== HERO =================================== */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_15%_0%,#fff,transparent),radial-gradient(60%_60%_at_85%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-4xl px-5 pt-14 pb-8">
          <p className="text-sm text-neutral-500">
            <Link href="/" className="hover:underline">
              Home
            </Link>{" "}
            / Affiliate Disclosure
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.08] tracking-tight">
            Affiliate Disclosure
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-neutral-700">
            We believe in clarity. Some outbound retailer links across RunwayTwin are{" "}
            <span className="font-medium">affiliate links</span>. If you choose to
            purchase through them, we may earn a small commission{" "}
            <span className="font-medium">at no extra cost to you</span>. Our styling
            choices remain independent and editorially led.
          </p>
        </div>
      </section>

      {/* =============================== CONTENT ================================ */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="space-y-8">
          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">
              How affiliate links work
            </h2>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              When we share a product, the link may contain a unique tracking parameter.
              If you buy something after clicking that link, the retailer pays us a small
              commission for the referral. The price you pay is exactly the same.
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">
              Editorial independence
            </h2>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              Taste comes first. Our outfit formulas and product shortlists are built by
              combining editor rules with body-type logic and availability. Retail
              relationships <span className="font-medium">never</span> decide what we
              recommend. We routinely include non-affiliate links when they’re the best
              fit for the look, the budget, or the size range.
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Retailer partners</h2>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              We work with a rotating selection of EU/US retailers that align with our
              quality, sizing, and delivery standards. Partner status can change over
              time as stock and programs evolve.
            </p>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Your choices</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-700">
              <li>
                You can always navigate directly to a retailer site if you prefer not to
                use an affiliate link.
              </li>
              <li>
                Our recommendations are provided for inspiration; please review each
                retailer’s returns, duties, and shipping policies before purchasing.
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Privacy & cookies</h2>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              Some affiliate programs use cookies to attribute a sale. For information on
              what we collect and how we use it, read our{" "}
              <Link href="/privacy" className="text-neutral-900 underline">
                Privacy Policy
              </Link>
              .
            </p>
          </article>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Questions?</h2>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              If anything here isn’t clear, we’d love to help. Reach us at{" "}
              <a href="mailto:support@runwaytwin.app" className="underline">
                support@runwaytwin.app
              </a>
              .
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Ready to get styled?</p>
              <p className="mt-1 text-sm text-neutral-700">
                Try a one-off look for €5 or go Premium for €19/month. Cancel anytime.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/stylist"
                className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Start Styling
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
              >
                See Plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
