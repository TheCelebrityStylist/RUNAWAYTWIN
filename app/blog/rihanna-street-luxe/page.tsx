import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Blog Article
   "Rihanna Street Luxe — volume, edge, easy drama"
   - Server Component (no 'use client')
   - Story-first editorial + scannable structure
   - JSON-LD: Article + BreadcrumbList
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "Rihanna Street Luxe — volume, edge, easy drama | RunwayTwin Journal",
  description:
    "Decode Rihanna’s streetwear signature into a wearable formula: oversized outerwear, crop + wide leg, bold accessories. Body-type notes and a copy-paste outfit recipe.",
  alternates: {
    canonical: "https://runwaytwin.vercel.app/blog/rihanna-street-luxe",
  },
  keywords: [
    "Rihanna style",
    "Rihanna streetwear",
    "street luxe",
    "crop and wide leg outfit",
    "celebrity style guide",
    "RunwayTwin Journal",
    "AI stylist",
  ],
  openGraph: {
    title:
      "Rihanna Street Luxe — volume, edge, easy drama | RunwayTwin Journal",
    description:
      "A clean, repeatable blueprint: palette, silhouette and finishing to channel Rihanna’s street luxe—fast.",
    url: "https://runwaytwin.vercel.app/blog/rihanna-street-luxe",
    siteName: "RunwayTwin",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Rihanna Street Luxe — volume, edge, easy drama | RunwayTwin Journal",
    description:
      "Oversized outerwear, crop + wide leg, bold accessories—get Rihanna’s energy without drowning the frame.",
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
  const url = "https://runwaytwin.vercel.app/blog/rihanna-street-luxe";

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
                name: "Rihanna Street Luxe — volume, edge, easy drama",
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
            headline: "Rihanna Street Luxe — volume, edge, easy drama",
            description:
              "A practical blueprint to channel Rihanna’s streetwear: oversized outerwear, crop + wide leg, bold accessories—plus body-type notes and a quick recipe.",
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
            articleSection: "Street Luxe",
            keywords: "Rihanna, streetwear, crop, wide-leg, RunwayTwin",
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
              Rihanna Street Luxe — volume, edge, easy drama
            </li>
          </ol>
        </nav>

        <div className="mb-4 flex items-center gap-2">
          <Eyebrow>Street Luxe</Eyebrow>
          <Eyebrow>Editorial</Eyebrow>
        </div>

        <header className="mb-6">
          <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
            Rihanna Street Luxe — volume, edge, easy drama
          </h1>
          <Kicker>
            Rihanna’s off-duty looks read like a hook you can’t get out of your
            head: oversized outerwear, a flash of skin, and a grounded shoe.
            The trick is scale—one big move, everything else in service of the
            silhouette. Here’s the blueprint.
          </Kicker>
        </header>

        <figure className="mb-10 rounded-2xl border border-neutral-200 bg-white/60 p-6 shadow-sm">
          <figcaption className="text-sm text-neutral-600">
            Picture this: a cavernous bomber, cropped knit, and a wide leg that
            skims the floor. Sunglasses at dusk optional—but encouraged.
          </figcaption>
        </figure>

        {/* 1) Pillars */}
        <section aria-labelledby="pillars" className="mb-10">
          <h2 id="pillars" className="font-serif text-2xl tracking-tight">
            1) The pillars: volume, flash, anchor
          </h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-7 text-neutral-700">
            <li>
              <strong>Volume:</strong> the first read comes from outerwear—an
              oversized bomber, moto, varsity, or trench with confident
              proportions.
            </li>
            <li>
              <strong>Flash:</strong> a cropped knit, bralette, or waist peek
              keeps the look sharp and intentional.
            </li>
            <li>
              <strong>Anchor:</strong> a substantial shoe—chunky boot, stacked
              trainer, or platform—grounds the silhouette.
            </li>
          </ul>
          <Note title="Why it works">
            Scale contrast adds rhythm: big jacket, clean torso, elongated leg.
            It reads expensive because the composition is deliberate.
          </Note>
        </section>

        {/* 2) Palette */}
        <section aria-labelledby="palette" className="mb-10">
          <h2 id="palette" className="font-serif text-2xl tracking-tight">
            2) Palette: city core with a hit of metal
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Keep the canvas urban—black, charcoal, concrete, olive, ink
            denim—then add hardware: pewter zips, brushed silver buckles,
            gunmetal studs. One metallic focal point is enough.
          </p>
          <ul className="mt-2 space-y-2 text-[15px] leading-7 text-neutral-700">
            <li>
              <strong>Base:</strong> black, asphalt grey, midnight, tobacco.
            </li>
            <li>
              <strong>Texture:</strong> waxed denim, matte leather, felted wool,
              dry nylon.
            </li>
            <li>
              <strong>Metal:</strong> brushed silver, pewter, blackened steel.
            </li>
          </ul>
        </section>

        {/* 3) Silhouette */}
        <section aria-labelledby="silhouette" className="mb-10">
          <h2 id="silhouette" className="font-serif text-2xl tracking-tight">
            3) Silhouette: crop + wide leg (with room to move)
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            The Rihanna ratio is simple: short on top, long and loose below. A
            cropped knit or tank pairs with wide trousers or baggy denim that
            drapes cleanly. Add the oversized jacket and the frame snaps into
            place.
          </p>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-neutral-900">
              Body-type notes
            </p>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-[15px] leading-7 text-neutral-700">
              <li>
                <strong>Pear:</strong> cropped knit draws the eye up; choose a
                jacket with sharp shoulder to balance the hip.
              </li>
              <li>
                <strong>Hourglass:</strong> ribbed crop with a soft band; wide
                leg with a clean, mid rise to honor the waist.
              </li>
              <li>
                <strong>Apple:</strong> boxy crop over a longer base tank; pick
                a gentle A-line wide leg to avoid squeeze.
              </li>
              <li>
                <strong>Rectangle:</strong> add curve through volume—padded
                bomber, belted trench, or paneled wide-leg denim.
              </li>
            </ul>
          </div>
        </section>

        {/* 4) Finish */}
        <section aria-labelledby="finish" className="mb-10">
          <h2 id="finish" className="font-serif text-2xl tracking-tight">
            4) Finishing: sunglasses, hardware, attitude
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Rihanna edits like a producer—one strong track, tight mix.
            Sunglasses with presence, minimal jewelry (or one statement), and a
            bag with hardware you can feel. No filler.
          </p>
          <Note title="Stylist’s cue">
            If the jacket is loud, keep jewelry quiet. If the shoe is heavy,
            keep the bag compact. The energy should stack, not shout.
          </Note>
        </section>

        {/* 5) Recipe */}
        <section aria-labelledby="recipe" className="mb-12">
          <h2 id="recipe" className="font-serif text-2xl tracking-tight">
            5) Quick recipe (copy-paste)
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-neutral-700">
            <li>Oversized outerwear: bomber, moto, varsity, trench.</li>
            <li>Cropped knit / tee / tank (or a neat base layer under).</li>
            <li>Wide trousers or baggy denim with clean drape.</li>
            <li>Grounding shoe: chunky boot, stacked trainer, or platform.</li>
            <li>Hardware focus: sunglasses + one metal accent (zip, buckle).</li>
            <li>Compact bag; keep proportions tight to the body.</li>
          </ol>
        </section>

        {/* 6) Brand tie-in */}
        <section aria-labelledby="make-it-yours" className="mb-12">
          <h2 id="make-it-yours" className="font-serif text-2xl tracking-tight">
            6) Make it yours—the RunwayTwin way
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Tell our stylist your brief—“Rihanna street luxe, everyday, mid
            budget”—and get a complete outfit blueprint in minutes, adjusted to
            your size, body type and EU/US availability. Fewer tabs, better
            outfits.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">
              Want Rihanna’s energy—minus the guesswork?
            </h3>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              Upload a muse, set your budget, and shop a head-to-toe look that
              feels like you—only sharper.
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
                A precise palette and line that always reads elevated.
              </p>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Minimalism
              </p>
              <h3 className="mt-1 text-base font-semibold">
                <Link
                  href="/blog/jennifer-lawrence-off-duty"
                  className="hover:underline"
                >
                  Jennifer Lawrence Off-Duty — sleek, pointed, effortless
                </Link>
              </h3>
              <p className="mt-1 text-sm leading-6 text-neutral-700">
                The clean capsule that carries you through the week.
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
