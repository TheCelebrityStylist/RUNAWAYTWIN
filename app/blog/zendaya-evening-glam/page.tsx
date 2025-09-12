import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Blog Article
   "Zendaya Evening Glam — the wearable formula"
   - Server Component (no 'use client')
   - Premium storytelling + conversion-minded CTA
   - Fully semantic + accessible + mobile-first
   - JSON-LD: Article + BreadcrumbList
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "Zendaya Evening Glam — the wearable formula | RunwayTwin Journal",
  description:
    "Translate Zendaya’s red-carpet signature into a repeatable evening outfit recipe. Palette, silhouette, finishing touches—tailored tips for every body type.",
  alternates: {
    canonical: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
  },
  keywords: [
    "Zendaya outfits",
    "Zendaya evening look",
    "celebrity style guide",
    "how to dress like Zendaya",
    "red carpet outfit formula",
    "AI stylist",
    "RunwayTwin Journal",
  ],
  openGraph: {
    title:
      "Zendaya Evening Glam — the wearable formula | RunwayTwin Journal",
    description:
      "A precise, repeatable blueprint: palette, silhouette, and finishing touches that turn Zendaya’s glam into your go-to evening look.",
    url: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
    siteName: "RunwayTwin",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Zendaya Evening Glam — the wearable formula | RunwayTwin Journal",
    description:
      "Turn a red-carpet signature into a wearable evening recipe—editorial, flattering, and easy to repeat.",
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
  return (
    <p className="text-[15px] leading-7 text-neutral-700">{children}</p>
  );
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
  const url = "https://runwaytwin.vercel.app/blog/zendaya-evening-glam";

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
                name: "Zendaya Evening Glam — the wearable formula",
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
            headline: "Zendaya Evening Glam — the wearable formula",
            description:
              "A precise, repeatable blueprint: palette, silhouette, and finishing touches that turn Zendaya’s glam into your go-to evening look.",
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
            articleSection: "Style Guide",
            keywords:
              "Zendaya, evening glam, red carpet, celebrity style, RunwayTwin",
          }),
        }}
      />

      {/* ================================ Article ================================ */}
      <article className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        {/* Breadcrumbs (screen-reader friendly) */}
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
              Zendaya Evening Glam — the wearable formula
            </li>
          </ol>
        </nav>

        <div className="mb-4 flex items-center gap-2">
          <Eyebrow>Style Guide</Eyebrow>
          <Eyebrow>Editorial</Eyebrow>
        </div>

        <header className="mb-6">
          <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
            Zendaya Evening Glam — the wearable formula
          </h1>
          <Kicker>
            Zendaya’s red-carpet magic isn’t about more; it’s about precision.
            Think focused palette, intentional lines, and a few impeccable
            finishing touches. Below, we translate that signature into a
            repeatable outfit recipe you can reuse for dinners, premieres, and
            any night that deserves a little cinema.
          </Kicker>
        </header>

        {/* Hero block (image placeholder box to keep layout elegant without assets) */}
        <figure className="mb-10 rounded-2xl border border-neutral-200 bg-white/60 p-6 shadow-sm">
          <figcaption className="text-sm text-neutral-600">
            Imagine: a liquid silk column, warm metal glint, and a pointed shoe
            that extends the line. The room quiets, the silhouette speaks.
          </figcaption>
        </figure>

        {/* 1) Mood */}
        <section aria-labelledby="mood" className="mb-10">
          <h2 id="mood" className="font-serif text-2xl tracking-tight">
            1) The mood: polished ease, not costume
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Zendaya feels modern because her looks breathe. One statement at a
            time. No clash of focal points. She picks a single hero—silhouette,
            color, or texture—and lets it carry the room.
          </p>

          <Note title="Try this at home">
            <ul className="list-disc pl-5 text-neutral-700">
              <li>Choose one hero: neckline, fabric, or cut.</li>
              <li>Strip the rest back to clean lines and calm color.</li>
              <li>Let the tailoring do most of the talking.</li>
            </ul>
          </Note>
        </section>

        {/* 2) Palette */}
        <section aria-labelledby="palette" className="mb-10">
          <h2 id="palette" className="font-serif text-2xl tracking-tight">
            2) Palette: deep neutrals, wet metallics, candlelit skin
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Evenings live between ink black, tobacco brown, gunmetal,
            champagne, and bronze—punctuated by sculptural white or a mood-rich
            burgundy. Fabrics that catch and release light—liquid silk, satin,
            polished leather—make everything read luminous.
          </p>
          <ul className="mt-3 space-y-2 text-[15px] leading-7 text-neutral-700">
            <li>
              <strong>Core neutrals:</strong> black, espresso, bone, slate.
            </li>
            <li>
              <strong>Metal notes:</strong> brushed gold, old-silver, champagne.
            </li>
            <li>
              <strong>Accent (optional):</strong> deep cherry, oxblood,
              night-navy.
            </li>
          </ul>
        </section>

        {/* 3) Silhouette */}
        <section aria-labelledby="silhouette" className="mb-10">
          <h2 id="silhouette" className="font-serif text-2xl tracking-tight">
            3) Silhouette: long line with decisive structure
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            The message is elongated. Think column dresses, fluid wide-leg
            trousers with a tucked bodice, or a pencil skirt with a sharp
            shoulder. The eye travels in one clear direction: down the line.
          </p>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-neutral-900">
              Body-type notes
            </p>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-[15px] leading-7 text-neutral-700">
              <li>
                <strong>Pear:</strong> balance the hip with a clean shoulder.
                Draped blouses, straight maxi skirts, and column dresses work
                beautifully.
              </li>
              <li>
                <strong>Hourglass:</strong> honor the waist without squeezing.
                Soft corsetry, bias cuts, and wrap details are effortless.
              </li>
              <li>
                <strong>Apple:</strong> extend the line with V-neck columns and
                long blazers; skip anything that breaks at the waist.
              </li>
              <li>
                <strong>Rectangle:</strong> add dynamic curves via bias,
                sculptural peplum, or an architectural shoulder.
              </li>
            </ul>
          </div>
        </section>

        {/* 4) Finishing trio */}
        <section aria-labelledby="finishing" className="mb-10">
          <h2 id="finishing" className="font-serif text-2xl tracking-tight">
            4) The finishing trio: jewelry · bag · shoe
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Keep the sentence short: one clause, three words. Jewelry is
            structural—a cuff, a clean drop, a sculptural hoop. Bags are compact
            and precise. Shoes are sleek—pointed pump or barely-there sandal—to
            keep the line uninterrupted.
          </p>
          <Note title="Stylist’s cue">
            Keep the verbs quiet: polish, taper, elongate. If one accessory
            shouts, let another whisper.
          </Note>
        </section>

        {/* 5) The formula */}
        <section aria-labelledby="recipe" className="mb-12">
          <h2 id="recipe" className="font-serif text-2xl tracking-tight">
            5) Your evening formula (copy-paste)
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-neutral-700">
            <li>Top: sculpted bodice, draped blouse, or liquid knit.</li>
            <li>Bottom: column skirt, tailored maxi, or fluid wide-leg trouser.</li>
            <li>Layer (optional): long blazer or cropped structured jacket.</li>
            <li>Shoe: pointed pump or minimalist sandal.</li>
            <li>Jewelry: one clear shape; keep metals consistent.</li>
            <li>Bag: compact clutch or micro top-handle.</li>
          </ol>
        </section>

        {/* 6) Brand tie-in */}
        <section aria-labelledby="make-it-yours" className="mb-12">
          <h2 id="make-it-yours" className="font-serif text-2xl tracking-tight">
            6) Make it yours—the RunwayTwin way
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            At <Link href="/" className="underline">RunwayTwin</Link>, we built our stylist on a
            simple idea: decode a celebrity signature into wearable formulas
            that respect your body type, your size, your budget, and your
            region. Describe your muse—“Zendaya, evening, mid budget”—and get a
            complete outfit blueprint in minutes.
          </p>

          {/* Conversion CTA */}
          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">
              Want Zendaya-level styling—tailored to you?
            </h3>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              Upload a muse, set your budget, and let our AI build your evening
              formula in minutes—adjusted to your body-type and size with EU/US
              stock awareness. No guesswork. Just outfits that look like you,
              only elevated.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <CTA href="/stylist" aria="Try the stylist now">
                ✨ Try the Stylist
              </CTA>
              <CTA href="/pricing" variant="light" aria="See pricing plans">
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
                How to get oversized energy without drowning the frame.
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

