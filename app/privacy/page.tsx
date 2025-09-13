// app/privacy/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* =============================================================================
   RunwayTwin — Privacy Policy (Bullet-Proof • GDPR/CCPA • SEO)
   - Covers GDPR (EEA/UK), CCPA/CPRA (California), global standards
   - Includes lawful bases, data types, cookies, retention, rights, contact
   - JSON-LD: PrivacyPolicy + Breadcrumb for SEO
   - Bulletproof: transparent, enforceable, compliant language
   ============================================================================= */

export const metadata: Metadata = {
  title: "Privacy Policy — RunwayTwin",
  description:
    "Learn how RunwayTwin collects, uses, and protects your personal data. GDPR, CCPA, and global compliance. Transparent, secure, and privacy-first.",
  alternates: { canonical: "https://runwaytwin.vercel.app/privacy" },
  keywords: [
    "RunwayTwin Privacy Policy",
    "GDPR privacy AI stylist",
    "CCPA compliance styling app",
    "data protection RunwayTwin",
    "AI fashion privacy",
  ],
  openGraph: {
    title: "Privacy Policy — RunwayTwin",
    description:
      "Our bullet-proof privacy policy explains how we process and protect your data. GDPR, CCPA, and international compliance built in.",
    url: "https://runwaytwin.vercel.app/privacy",
    siteName: "RunwayTwin",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — RunwayTwin",
    description:
      "Transparent and compliant privacy: GDPR, CCPA, global standards. Full rights and protections detailed.",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ========================== JSON-LD ========================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Privacy Policy",
            url: "https://runwaytwin.vercel.app/privacy",
            description:
              "RunwayTwin privacy policy — GDPR/EEA, CCPA, and global compliance with data rights, lawful bases, and protections.",
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
                  name: "Privacy Policy",
                  item: "https://runwaytwin.vercel.app/privacy",
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
            / Privacy Policy
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.1] tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-neutral-700">
            At RunwayTwin, your privacy is not optional. This Privacy Policy
            explains what we collect, how we use it, and your rights under GDPR,
            CCPA, and international data laws. We believe in{" "}
            <span className="font-medium">transparency, security, and control</span> —
            always.
          </p>
        </div>
      </section>

      {/* ========================== CONTENT ========================== */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <div className="space-y-10 text-sm leading-7 text-neutral-700">
          {/* Who we are */}
          <article>
            <h2 className="text-lg font-semibold">1. Who we are</h2>
            <p className="mt-2">
              RunwayTwin (“we”, “us”, “our”) provides an AI-powered stylist
              service. This Privacy Policy applies to our website and app at{" "}
              <span className="font-medium">runwaytwin.vercel.app</span>.
            </p>
          </article>

          {/* What data we collect */}
          <article>
            <h2 className="text-lg font-semibold">2. What data we collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <b>Account & profile:</b> email, password, region (EU/US), sizing,
                style preferences, saved looks.
              </li>
              <li>
                <b>Styling inputs:</b> prompts, occasions, optional uploaded images
                for AI styling.
              </li>
              <li>
                <b>Usage data:</b> pages visited, device/browser info, IP address,
                referral, session logs.
              </li>
              <li>
                <b>Payments:</b> handled securely by Stripe (we never store card
                numbers).
              </li>
              <li>
                <b>Affiliate tracking:</b> outbound click IDs for commission
                attribution.
              </li>
            </ul>
          </article>

          {/* How we use data */}
          <article>
            <h2 className="text-lg font-semibold">3. How we use data</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>To provide and personalize styling results.</li>
              <li>To process payments and manage subscriptions.</li>
              <li>To show live EU/US stock, size, and budget availability.</li>
              <li>To maintain security, prevent fraud, and debug issues.</li>
              <li>To comply with law, tax, and regulatory requirements.</li>
            </ul>
          </article>

          {/* GDPR legal bases */}
          <article>
            <h2 className="text-lg font-semibold">4. GDPR lawful bases</h2>
            <p className="mt-2">
              If you are in the EEA/UK, we process personal data only when a
              lawful basis applies:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li><b>Contract:</b> to deliver the services you request.</li>
              <li><b>Consent:</b> for cookies, marketing, optional analytics.</li>
              <li><b>Legitimate interests:</b> improving services, fraud prevention.</li>
              <li><b>Legal obligation:</b> compliance with tax, AML, legal duties.</li>
            </ul>
          </article>

          {/* Cookies */}
          <article>
            <h2 className="text-lg font-semibold">5. Cookies & tracking</h2>
            <p className="mt-2">
              We use essential cookies for authentication and security. With
              consent, we use analytics cookies for product improvement and
              affiliate cookies for attribution. You can manage cookies in your
              browser and via our consent banner.
            </p>
          </article>

          {/* Data retention */}
          <article>
            <h2 className="text-lg font-semibold">6. Data retention</h2>
            <p className="mt-2">
              We keep personal data only as long as necessary: to deliver the
              service, comply with law, resolve disputes, and enforce agreements.
              You may request deletion anytime.
            </p>
          </article>

          {/* Sharing */}
          <article>
            <h2 className="text-lg font-semibold">7. Data sharing</h2>
            <p className="mt-2">We never sell your personal data. We share only with:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Service providers (hosting, analytics, AI APIs).</li>
              <li>Payment processor (Stripe) for billing.</li>
              <li>Affiliate partners for click attribution.</li>
              <li>Authorities where legally required.</li>
            </ul>
          </article>

          {/* International transfers */}
          <article>
            <h2 className="text-lg font-semibold">8. International transfers</h2>
            <p className="mt-2">
              If we transfer data outside your country (e.g., outside the EEA/UK),
              we apply appropriate safeguards (Standard Contractual Clauses,
              adequacy decisions, vendor audits).
            </p>
          </article>

          {/* Security */}
          <article>
            <h2 className="text-lg font-semibold">9. Security</h2>
            <p className="mt-2">
              We implement encryption, access controls, and security monitoring.
              While no system is 100% secure, we take steps to reduce risks and
              notify you if required by law.
            </p>
          </article>

          {/* Your rights */}
          <article>
            <h2 className="text-lg font-semibold">10. Your rights</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Access, rectify, or erase personal data.</li>
              <li>Restrict or object to processing.</li>
              <li>Withdraw consent at any time.</li>
              <li>Port data to another service.</li>
              <li>File a complaint with your supervisory authority.</li>
            </ul>
          </article>

          {/* CCPA */}
          <article>
            <h2 className="text-lg font-semibold">11. California residents (CCPA/CPRA)</h2>
            <p className="mt-2">
              If you are a California resident, you may request access to,
              deletion of, or details about personal data we hold. We do not
              sell personal data. Requests:{" "}
              <a href="mailto:support@runwaytwin.app" className="underline">
                support@runwaytwin.app
              </a>
              .
            </p>
          </article>

          {/* Children */}
          <article>
            <h2 className="text-lg font-semibold">12. Children</h2>
            <p className="mt-2">
              RunwayTwin is not directed to children under 13 (or as required by
              local law). We do not knowingly collect data from children. Contact
              us for removal if necessary.
            </p>
          </article>

          {/* Changes */}
          <article>
            <h2 className="text-lg font-semibold">13. Changes to this policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy for product, legal, or operational
              reasons. Updates will be posted here with a new date.
            </p>
          </article>

          {/* Contact */}
          <article>
            <h2 className="text-lg font-semibold">14. Contact us</h2>
            <p className="mt-2">
              Questions, requests, or rights? Contact us:
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
