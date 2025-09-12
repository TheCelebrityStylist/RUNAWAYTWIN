import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Blog Article
   "Jennifer Lawrence Off-Duty — sleek, pointed, effortless"
   - Server Component (no 'use client')
   - Story-first editorial + scannable structure
   - JSON-LD: Article + BreadcrumbList
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "Jennifer Lawrence Off-Duty — sleek, pointed, effortless | RunwayTwin Journal",
  description:
    "Decode Jennifer Lawrence’s minimal workwear capsule: neutral palette, clean tailoring, pointed shoes. Body-type notes and a copy-paste outfit recipe.",
  alternates: {
    canonical:
      "https://runwaytwin.vercel.app/blog/jennifer-lawrence-off-duty",
  },
  keywords: [
    "Jennifer Lawrence style",
    "minimal capsule wardrobe",
    "workwear capsule",
    "pointed shoes outfit",
    "celebrity style guide",
    "RunwayTwin Journal",
    "AI stylist",
  ],
  openGraph: {
    title:
      "Jennifer Lawrence Off-Duty — sleek, pointed, effortless | RunwayTwin Journal",
    description:
      "A wearable capsule blueprint: palette, tailoring and finishing to channel Jennifer’s clean, modern minimalism—fast.",
    url: "https://runwaytwin.vercel.app/blog/jennifer-lawrence-off-duty",
    siteName: "RunwayTwin",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Jennifer Lawrence Off-Duty — sleek, pointed, effortless | RunwayTwin Journal",
    description:
      "Neutral palette, precise tailoring, pointed shoes—the everyday capsule you’ll actually wear.",
  },
};

/* ------------------------------- UI atoms -------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">
      {children}
    </span>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-7 text-neutral-700">{children}</p>;
}

function Note({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside
      aria-label={title}
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-2 text-sm leading-7 text-neutral-700">{children}</p>
    </aside>
  );
}

function CTA({
  href,
  children,
  variant = "primary",
  aria,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "light";
  aria?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15";
  const cls =
    variant === "primary"
      ? "bg-black text-white hover:opacity-90"
      : variant === "light"
      ? "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
      : "text-neutral-900 hover:underline";
  return (
    <Link href={href} aria-label={aria} className={`${base} ${cls}`}>
      {children}
    </Link>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function Page() {
  const url =
    "https://runwaytwin.vercel.app/blog/jennifer-lawrence-off-duty";

  return (
    <main className="bg-[#FAF9F6] text-neutral-900 antialiased">
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
              {
                "@type": "ListItem",
                position: 2,
                name: "Blog",
                item: "https://runwaytwin.vercel.app/blog",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "Jennifer Lawrence Off-Duty — sleek, pointed, effortless",
                item: url,
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
            "@type": "Article",
            headline: "Jennifer Lawrence Off-Duty — sleek, pointed, effortless",
            description:
              "A practical capsule blueprint to channel Jennifer Lawrence’s minimal off-duty style—neutral palette, clean tailoring, pointed shoes—plus body-type notes and a quick recipe.",
            author: [{ "@type": "Organization", name: "RunwayTwin" }],
            publisher: {
              "@type": "Organization",
              name: "RunwayTwin",
              logo: {
                "@type": "ImageObject",
                url: "https://runwaytwin.vercel.app/og-image.png",
              },
            },
            mainEntityOfPage: url,
            datePublished: "2025-09-12",
            dateModified: "2025-09-12",
            articleSection: "Minimalism",
            keywords:
              "Jennifer Lawrence, minimalism, work capsule, pointed shoes, RunwayTwin",
          }),
        }}
      />

      {/* ================================ Article ================================ */}
      <article className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-2 text-neutral-500">
            <li>
              <Link href="/" className="hover:text-neutral-900">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href="/blog" className="hover:text-neutral-900">
                Blog
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="text-neutral-800">
              Jennifer Lawrence Off-Duty — sleek, pointed, effortless
            </li>
          </ol>
        </nav>

        <div className="mb-4 flex items-center gap-2">
          <Eyebrow>Minimalism</Eyebrow>
          <Eyebrow>Editorial</Eyebrow>
        </div>

        <header className="mb-6">
          <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
            Jennifer Lawrence Off-Duty — sleek, pointed, effortless
          </h1>
          <Kicker>
            Jennifer’s off-duty uniform is a clean sentence: neutral palette,
            knife-sharp tailoring, pointed shoes. No fuss, no filler, just
            clarity. This guide translates that clarity into a repeatable,
            weekday-proof capsule.
          </Kicker>
        </header>

        <figure className="mb-10 rounded-2xl border border-neutral-200 bg-white/60 p-6 shadow-sm">
          <figcaption className="text-sm text-neutral-600">
            Imagine a lean blazer over a compact knit, trousers that fall like a
            line, and a pointed shoe that finishes the thought. Polished,
            modern, calm.
          </figcaption>
        </figure>

        {/* 1) Mindset */}
        <section aria-labelledby="mindset" className="mb-10">
          <h2 id="mindset" className="font-serif text-2xl tracking-tight">
            1) The mindset: edit first, then refine
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Start by removing noise: extra trims, pattern clutter, fussy
            hardware. What remains should be articulate fabrics and precise
            lines. Fewer choices, better choices.
          </p>
          <Note title="Try this tomorrow">
            Limit the look to three tones (e.g., bone, slate, black). Choose one
            hero (blazer or shoe), and let everything else support it.
          </Note>
        </section>

        {/* 2) Palette */}
        <section aria-labelledby="palette" className="mb-10">
          <h2 id="palette" className="font-serif text-2xl tracking-tight">
            2) Palette: neutral core with cool clarity
          </h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-7 text-neutral-700">
            <li>
              <strong>Base:</strong> bone, soft white, light oatmeal, slate,
              ink.
            </li>
            <li>
              <strong>Contrast:</strong> black, espresso, charcoal—used
              sparingly for structure.
            </li>
            <li>
              <strong>Texture:</strong> fine wool, compact knit, matte leather,
              crisp poplin.
            </li>
            <li>
              <strong>Metal:</strong> quiet silver—delicate clasp, minimal hoop,
              slim buckle.
            </li>
          </ul>
        </section>

        {/* 3) Silhouette */}
        <section aria-labelledby="silhouette" className="mb-10">
          <h2 id="silhouette" className="font-serif text-2xl tracking-tight">
            3) Silhouette: clean shoulder, long line, pointed finish
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Begin with a straight shoulder and a blazer that skims. Underneath,
            a compact knit or fine tee. Trousers are straight or subtly wide
            with weight in the hem. Finish with a pointed shoe—flat, kitten, or
            mid heel—that elongates without effort.
          </p>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-neutral-900">
              Body-type notes
            </p>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-[15px] leading-7 text-neutral-700">
              <li>
                <strong>Pear:</strong> pad the shoulder slightly; keep the hem
                weighty to lengthen the leg.
              </li>
              <li>
                <strong>Hourglass:</strong> choose a softly shaped blazer; avoid
                hard cinches—let drape do the work.
              </li>
              <li>
                <strong>Apple:</strong> opt for a straight blazer over a longer
                base tank; mid-rise trouser to smooth the line.
              </li>
              <li>
                <strong>Rectangle:</strong> add curve with a subtle hourglass
                blazer or a knit with gentle waist shaping.
              </li>
            </ul>
          </div>
        </section>

        {/* 4) Finishing */}
        <section aria-labelledby="finish" className="mb-10">
          <h2 id="finish" className="font-serif text-2xl tracking-tight">
            4) Finishing: quiet details, pointed intent
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Jewelry is delicate: a fine hoop or a slim chain. Bags are structured
            but light. Sunglasses are clean, not oversized. The pointed shoe
            does the talking; everything else keeps the room calm.
          </p>
          <Note title="Stylist’s cue">
            If the blazer is sculpted, choose a simple bag. If the trouser is
            long and fluid, pick a firm leather shoe for contrast.
          </Note>
        </section>

        {/* 5) Recipe */}
        <section aria-labelledby="recipe" className="mb-12">
          <h2 id="recipe" className="font-serif text-2xl tracking-tight">
            5) Quick recipe (copy-paste)
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-neutral-700">
            <li>Sleek blazer with a clean shoulder.</li>
            <li>Compact knit or crisp tee in a soft neutral.</li>
            <li>Straight or gentle wide-leg trouser, weighted hem.</li>
            <li>Pointed shoe (flat / kitten / mid heel).</li>
            <li>Structured mini-shoulder or top-handle bag.</li>
            <li>Minimal silver jewelry; polished sunglasses.</li>
          </ol>
        </section>

        {/* 6) Brand tie-in */}
        <section aria-labelledby="make-it-yours" className="mb-12">
          <h2 id="make-it-yours" className="font-serif text-2xl tracking-tight">
            6) Make it yours—the RunwayTwin way
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Give our stylist your brief—“Jennifer Lawrence off-duty, work,
            high-street” or “minimal capsule, mid”—and get a complete outfit
            blueprint in minutes, tuned to your size, body type and region
            (EU/US). Less guesswork, more wearing.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">
              Want a clean, weekday-proof capsule?
            </h3>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              Upload a muse, set your budget, and shop a refined look that works
              on repeat.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <CTA href="/stylist" aria="Try the stylist">
                ✨ Try the Stylist
              </CTA>
              <CTA href="/pricing" variant="light" aria="See pricing">
                See Plans
              </CTA>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              7-day money-back on Premium · Cancel anytime · EU/US coverage
            </p>
          </div>
        </section>

        {/* Next reads */}
        <section aria-labelledby="next-read" className="mb-12">
          <h2 id="next-read" className="sr-only">
            Next reads
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Street Luxe
              </p>
              <h3 className="mt-1 text-base font-semibold">
                <Link
                  href="/blog/rihanna-street-luxe"
                  className="hover:underline"
                >
                  Rihanna Street Luxe — volume, edge, easy drama
                </Link>
              </h3>
              <p className="mt-1 text-sm leading-6 text-neutral-700">
                Oversized outerwear, crop + wide leg, bold accessories—without
                drowning the frame.
              </p>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Evening Formula
              </p>
              <h3 className="mt-1 text-base font-semibold">
                <Link
                  href="/blog/zendaya-evening-glam"
                  className="hover:underline"
                >
                  Zendaya Evening Glam — the wearable formula
                </Link>
              </h3>
              <p className="mt-1 text-sm leading-6 text-neutral-700">
                Polished ease, candlelit palette, decisive structure.
              </p>
            </article>
          </div>
        </section>

        {/* Final soft CTA */}
        <div className="flex flex-wrap gap-3 pb-6">
          <CTA href="/stylist">Start Styling</CTA>
          <CTA href="/pricing" variant="light">
            Go Premium
          </CTA>
        </div>

        <p className="border-t border-neutral-200 pt-6 text-xs text-neutral-500">
          Disclosure: some outbound retailer links across the site may be
          affiliate; we may earn a small commission at no extra cost to you.
        </p>
      </article>
    </main>
  );
}
