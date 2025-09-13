// app/terms/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* =============================================================================
   RunwayTwin — Terms of Service (Bullet-Proof • Legal • SEO)
   - Covers acceptance, eligibility, accounts, license, acceptable use, IP,
     payments, cancellations, disclaimers, liability, governing law.
   - JSON-LD: TermsOfService + Breadcrumb
   - Premium UX: clear headings, legal trust tone, mobile optimized
   ============================================================================= */

export const metadata: Metadata = {
  title: "Terms of Service — RunwayTwin",
  description:
    "Read RunwayTwin's Terms of Service. Clear rules for using our AI stylist platform: accounts, subscriptions, payments, acceptable use, disclaimers, and your rights.",
  alternates: { canonical: "https://runwaytwin.vercel.app/terms" },
  keywords: [
    "RunwayTwin Terms of Service",
    "AI stylist legal terms",
    "subscription agreement",
    "fashion AI service terms",
    "user agreement RunwayTwin",
  ],
  openGraph: {
    title: "Terms of Service — RunwayTwin",
    description:
      "Bullet-proof Terms of Service for RunwayTwin: subscription, usage, rights, disclaimers, governing law, and data protections.",
    url: "https://runwaytwin.vercel.app/terms",
    siteName: "RunwayTwin",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — RunwayTwin",
    description:
      "Legal terms for using RunwayTwin: subscriptions, acceptable use, disclaimers, rights, and obligations.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ========================== JSON-LD ========================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TermsOfService",
            name: "RunwayTwin Terms of Service",
            url: "https://runwaytwin.vercel.app/terms",
            description:
              "RunwayTwin Terms of Service governing subscriptions, accounts, acceptable use, payments, disclaimers, and governing law.",
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
                  name: "Terms of Service",
                  item: "https://runwaytwin.vercel.app/terms",
                },
              ],
            },
          }),
        }}
      />

      {/* ========================== HERO ========================== */}
      <section className="relative">
        <div className="mx-auto max-w-4xl px-5 pt-14 pb-10">
          <p className="text-sm text-neutral-500">
            <Link href="/" className="hover:underline">
              Home
            </Link>{" "}
            / Terms of Service
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.1] tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-neutral-700">
            These Terms of Service (“Terms”) govern your access to and use of
            RunwayTwin’s platform, apps, and services. By using our services,
            you agree to these Terms. Please read carefully.
          </p>
        </div>
      </section>

      {/* ========================== CONTENT ========================== */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <div className="space-y-10 text-sm leading-7 text-neutral-700">
          {/* Acceptance */}
          <article>
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By creating an account, purchasing a subscription, or using our
              services, you accept these Terms and our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not use RunwayTwin.
            </p>
          </article>

          {/* Eligibility */}
          <article>
            <h2 className="text-lg font-semibold">2. Eligibility</h2>
            <p className="mt-2">
              You must be at least 18 years old (or the age of majority in your
              jurisdiction) to use our services. By using RunwayTwin, you
              represent that you meet this requirement.
            </p>
          </article>

          {/* Accounts */}
          <article>
            <h2 className="text-lg font-semibold">3. Accounts</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activity under your account. Notify
              us immediately if you suspect unauthorized use.
            </p>
          </article>

          {/* License */}
          <article>
            <h2 className="text-lg font-semibold">4. License & Use</h2>
            <p className="mt-2">
              RunwayTwin grants you a limited, non-exclusive, revocable license
              to access and use our platform for personal, non-commercial use.
              You may not copy, modify, reverse-engineer, resell, or exploit our
              content or AI outputs without permission.
            </p>
          </article>

          {/* Acceptable Use */}
          <article>
            <h2 className="text-lg font-semibold">5. Acceptable Use</h2>
            <ul className="mt-2 list-disc pl-5">
              <li>No unlawful, harmful, or abusive use.</li>
              <li>No scraping, automated bots, or misuse of AI outputs.</li>
              <li>No infringement of intellectual property or third-party rights.</li>
              <li>No attempt to bypass security or payment systems.</li>
            </ul>
          </article>

          {/* Payments */}
          <article>
            <h2 className="text-lg font-semibold">6. Subscriptions & Payments</h2>
            <p className="mt-2">
              Paid services are billed via our payment processor (Stripe). You
              authorize charges for subscriptions and agree to keep payment
              details up to date. Prices include VAT where applicable.
            </p>
          </article>

          {/* Cancellations */}
          <article>
            <h2 className="text-lg font-semibold">7. Cancellations & Refunds</h2>
            <p className="mt-2">
              You may cancel Premium anytime via your account. Premium includes
              a <span className="font-medium">7-day money-back guarantee</span>.
              After this period, payments are non-refundable unless required by
              law.
            </p>
          </article>

          {/* Intellectual Property */}
          <article>
            <h2 className="text-lg font-semibold">8. Intellectual Property</h2>
            <p className="mt-2">
              All content, code, trademarks, and branding are owned by
              RunwayTwin or licensors. You retain ownership of your styling
              inputs, but grant us a license to process them to deliver the
              service.
            </p>
          </article>

          {/* Disclaimers */}
          <article>
            <h2 className="text-lg font-semibold">9. Disclaimers</h2>
            <p className="mt-2">
              RunwayTwin provides services “as is” without warranties of any
              kind. We do not guarantee that recommendations will fit, be in
              stock, or meet every preference. Use discretion when purchasing
              through third-party retailers.
            </p>
          </article>

          {/* Liability */}
          <article>
            <h2 className="text-lg font-semibold">10. Limitation of Liability</h2>
            <p className="mt-2">
              To the fullest extent permitted by law, RunwayTwin and its
              affiliates are not liable for indirect, incidental, or
              consequential damages. Our total liability shall not exceed the
              amount you paid in the last 12 months.
            </p>
          </article>

          {/* Governing Law */}
          <article>
            <h2 className="text-lg font-semibold">11. Governing Law & Jurisdiction</h2>
            <p className="mt-2">
              These Terms are governed by the laws of the Netherlands, without
              regard to conflict of law principles. Disputes shall be subject to
              the exclusive jurisdiction of the courts in Amsterdam.
            </p>
          </article>

          {/* Changes */}
          <article>
            <h2 className="text-lg font-semibold">12. Changes</h2>
            <p className="mt-2">
              We may update these Terms from time to time. Material changes will
              be notified by email or prominently on our site. Continued use
              means acceptance.
            </p>
          </article>

          {/* Contact */}
          <article>
            <h2 className="text-lg font-semibold">13. Contact</h2>
            <p className="mt-2">
              For questions about these Terms, contact us:
              <br />
              <a href="mailto:support@runwaytwin.app" className="underline">
                support@runwaytwin.app
              </a>
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Last updated: {new Date().toISOString().slice(0, 10)}
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
