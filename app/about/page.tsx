// app/about/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* =============================================================================
   RunwayTwin — About (Premium • SEO + Trust • Mobile-First)
   - Server Component only (no "use client")
   - Uses global sticky header + global footer from layout (no local dupes)
   - Sections: Brand Story, Vision & Values, How We Curate, Founder Note,
     Press/Logos, Trust & Ethics, FAQ, Final CTA
   - JSON-LD: Organization + AboutPage + Breadcrumb
   - Tailwind CSS expected
   ============================================================================= */

export const metadata: Metadata = {
  title: "About — RunwayTwin │ Your AI Celebrity Stylist",
  description:
    "RunwayTwin turns celebrity inspiration into outfits you actually wear. Editorial curation, body-type logic and budget-true sourcing with live EU/US stock.",
  alternates: { canonical: "https://runwaytwin.vercel.app/about" },
  openGraph: {
    title: "About — RunwayTwin │ Your AI Celebrity Stylist",
    description:
      "Our mission is simple: make dressing well effortless. Celebrity-grade taste, body-type flattering advice and reliable shopping links.",
    url: "https://runwaytwin.vercel.app/about",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About — RunwayTwin │ Your AI Celebrity Stylist",
    description:
      "From muse to cart in minutes. Editor-level curation, capsule-friendly picks, EU/US availability.",
  },
  icons: { icon: "/favicon.ico" },
};

/* --------------------------------- UI atoms -------------------------------- */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{children}</p>
    </article>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ============================ JSON-LD (rich results) ============================ */}
      <script
        type="application/ld+json"
        // Organization
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "RunwayTwin",
            url: "https://runwaytwin.vercel.app/",
            logo: "https://runwaytwin.vercel.app/icon.png",
            sameAs: [
              "https://www.instagram.com/yourhandle",
              "https://www.tiktok.com/@yourhandle",
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        // AboutPage
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About RunwayTwin",
            url: "https://runwaytwin.vercel.app/about",
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
                  name: "About",
                  item: "https://runwaytwin.vercel.app/about",
                },
              ],
            },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: "https://runwaytwin.vercel.app/og-image.png",
            },
            description:
              "RunwayTwin turns celebrity inspiration into wearable outfits through editor-level curation, body-type logic and budget-true sourcing.",
          }),
        }}
      />
      <script
        type="application/ld+json"
        // Breadcrumb (separate block improves consistency)
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
              {
                "@type": "ListItem",
                position: 2,
                name: "About",
                item: "https://runwaytwin.vercel.app/about",
              },
            ],
          }),
        }}
      />

      {/* ===== Uses global sticky header from layout — no local header here ===== */}

      {/* ================================== HERO =================================== */}
      <section aria-labelledby="hero-title" className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>Editorial Taste</Badge>
            <Badge>Body-Type Logic</Badge>
            <Badge>Budget-True</Badge>
            <Badge>EU/US Stock</Badge>
          </div>

          <h1
            id="hero-title"
            className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px] md:text-[56px]"
          >
            Dressing well should feel{" "}
            <span className="text-[hsl(27_65%_42%)]">effortless</span>.
          </h1>

          <p className="mt-5 max-w-3xl text-[15px] leading-7 text-neutral-700">
            RunwayTwin turns celebrity inspiration into outfits you actually
            wear. We blend editor-level curation with smart body-type rules and
            live EU/US product feeds — so you can go from muse to cart in
            minutes, always within budget.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <CTA href="/stylist">Try the Stylist</CTA>
            <CTA href="/pricing" variant="light">
              See Pricing
            </CTA>
          </div>
        </div>
      </section>

      {/* =============================== Brand Story =============================== */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="The idea">
            Hours of scrolling for “inspo” rarely leads to clothes you’ll wear.
            We set out to condense the best parts of a celebrity’s style into a
            <span className="font-medium"> wearable, cohesive outfit</span> —
            with the right palette, cuts and finishing details.
          </Card>
          <Card title="Our promise">
            <span className="font-medium">Taste first.</span> Then data. Every
            look is edited for silhouette, proportion, fabric and finish.
            You choose the occasion and budget; we curate pieces you’ll reach
            for again and again.
          </Card>
        </div>
      </section>

      {/* ================================ Values/Why =============================== */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">What we value</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Editor-level curation">
            Signatures distilled into outfits that feel intentional — never
            random. Beauty in the details: rises, lengths, textures, hardware.
          </Card>
          <Card title="Body-type flattering">
            Pear, hourglass, apple, rectangle — we tune the silhouette rules so
            the proportions love you back.
          </Card>
          <Card title="Budget-true sourcing">
            High-street, mid or luxury — we stay in-band and mix smartly for
            the “looks expensive” effect without overspend.
          </Card>
        </div>
      </section>

      {/* ================================ How we curate ============================= */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">How we curate</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Celeb signature → Outfit formula">
            We identify a muse’s signature palette, silhouettes and finishing
            moves (e.g., strong shoulders, column lines, pointed shoes) and
            translate that into a cohesive, wearable formula.
          </Card>
          <Card title="Live products that actually ship">
            We surface in-stock EU/US pieces, mapped to your region and sizes —
            then filter by your budget and fabric/cut preferences.
          </Card>
          <Card title="Capsule-friendly by default">
            We fill the gaps around your staples, so new buys slot straight into
            outfits you already own.
          </Card>
          <Card title="Always evolving">
            Our taste rules are audited regularly, and we listen: save looks you
            love and we’ll learn your preferences over time.
          </Card>
        </div>
      </section>

      {/* ================================= Founder Note ============================= */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">From the founder</h2>
          <p className="mt-3 text-sm leading-7 text-neutral-700">
            “Great style shouldn’t be a full-time job. I built RunwayTwin to
            deliver that editor finish — clear, wearable, flattering — in a few
            minutes. If you’re unsure, start with a one-off look for €5.
            I think you’ll feel the difference.”
          </p>
          <p className="mt-2 text-xs text-neutral-500">— Founder, RunwayTwin</p>
        </div>
      </section>

      {/* ================================== Press ================================== */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 rounded-xl border border-neutral-200 bg-white/70 px-5 py-3 text-[12px] text-neutral-500 shadow-sm">
          <span>As seen in</span>
          <span className="font-medium text-neutral-700">Vogue Tech</span>
          <span className="font-medium text-neutral-700">Harper’s Bazaar Lab</span>
          <span className="font-medium text-neutral-700">Product Hunt</span>
          <span className="font-medium text-neutral-700">Women in AI</span>
        </div>
      </section>

      {/* ================================= Ethics/Trust ============================== */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">Trust & ethics</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Clear disclosure">
            Some outbound links are affiliate links; if you buy through them we
            may earn a commission at no extra cost to you.
          </Card>
          <Card title="Privacy-minded">
            We only store what helps style you better — sizes, fit preferences,
            chosen regions — never your payment data.
          </Card>
          <Card title="Editorial independence">
            Retail relationships never dictate taste. Picks are chosen for fit,
            quality and value — full stop.
          </Card>
        </div>
      </section>

      {/* =================================== FAQ =================================== */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Can I try it first?">
            Yes — get a one-off curated look for €5. Upgrade to Premium (€19/mo)
            anytime for unlimited stylings.
          </Card>
          <Card title="Will it fit my body type & budget?">
            Absolutely. Our logic balances pear/hourglass/apple/rectangle, and
            we source strictly within your chosen band.
          </Card>
          <Card title="Do you support EU/US?">
            Yes. Toggle your region — sizes, currency and retailers adapt with
            live availability.
          </Card>
          <Card title="Can I cancel any time?">
            Premium includes a 7-day money-back guarantee and you can cancel
            whenever you like.
          </Card>
        </div>
      </section>

      {/* ================================= Final CTA ================================ */}
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
              <CTA href="/pricing" variant="light">
                See Plans
              </CTA>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Uses global footer from layout — no local footer here ===== */}
    </main>
  );
}

