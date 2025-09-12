import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Blog Article
   "Blake Lively Occasion Glam — color play, polish, joyful drama"
   - Server Component (no 'use client')
   - Story-first editorial + scannable structure
   - JSON-LD: Article + BreadcrumbList
   - Premium CTA blocks, mobile-first, internal linking
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "Blake Lively Occasion Glam — color play, polish, joyful drama | RunwayTwin Journal",
  description:
    "Decode Blake Lively’s celebration dressing: sculpted fit, confident color, sparkle in the right places. A body-type aware formula with a copy-paste outfit recipe.",
  alternates: {
    canonical: "https://runwaytwin.vercel.app/blog/blake-lively-occasion-glam",
  },
  keywords: [
    "Blake Lively style",
    "occasion wear",
    "wedding guest outfit",
    "colorful evening dress",
    "statement coat styling",
    "RunwayTwin Journal",
    "AI stylist",
  ],
  openGraph: {
    title:
      "Blake Lively Occasion Glam — color play, polish, joyful drama | RunwayTwin Journal",
    description:
      "A cheerful, polished blueprint for occasions: bright palettes, sculpted fit, and cinematic finishing. Body-type notes + quick recipe inside.",
    url: "https://runwaytwin.vercel.app/blog/blake-lively-occasion-glam",
    type: "article",
    siteName: "RunwayTwin",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Blake Lively Occasion Glam — color play, polish, joyful drama | RunwayTwin Journal",
    description:
      "Make an entrance: color play, sculpted fit, and sparkle where it counts. A storytelling guide to Blake’s occasion glam.",
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
  const url = "https://runwaytwin.vercel.app/blog/blake-lively-occasion-glam";

  return (
    <main className="bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ============================ JSON-LD ============================ */}
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
                name: "Blake Lively Occasion Glam — color play, polish, joyful drama",
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
            headline:
              "Blake Lively Occasion Glam — color play, polish, joyful drama",
            description:
              "A practical blueprint for Blake’s occasion glam: bright palettes, sculpted fit, and cinematic finishing. Includes body-type notes and a quick recipe.",
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
            articleSection: "Occasion",
            keywords:
              "Blake Lively, occasion wear, color dress, statement coat, RunwayTwin",
          }),
        }}
      />

      {/* ================================ Article ================================ */}
      <article className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        {/* Breadcrumbs */}
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
              Blake Lively Occasion Glam — color play, polish, joyful drama
            </li>
          </ol>
        </nav>

        <div className="mb-4 flex items-center gap-2">
          <Eyebrow>Occasion</Eyebrow>
          <Eyebrow>Editorial</Eyebrow>
        </div>

        <header className="mb-6">
          <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
            Blake Lively Occasion Glam — color play, polish, joyful drama
          </h1>
          <Kicker>
            Blake doesn’t just attend a party—she brings the party. Think rich
            color, sculpted fit, and sparkle where it counts. The effect is
            cinematic and cheerful, never heavy. Use this guide to turn
            invitations into entrances.
          </Kicker>
        </header>

        <figure className="mb-10 rounded-2xl border border-neutral-200 bg-white/60 p-6 shadow-sm">
          <figcaption className="text-sm text-neutral-600">
            Imagine a saturated sheath with a statement coat drifting behind,
            jewelry catching light like confetti, and a sleek heel carving the
            silhouette.
          </figcaption>
        </figure>

        {/* 1) Attitude */}
        <section aria-labelledby="attitude" className="mb-10">
          <h2 id="attitude" className="font-serif text-2xl tracking-tight">
            1) Attitude first: celebratory, not serious
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Blake’s glam works because it’s joyful. Color is confident, shapes
            are sculpted, and details feel playful. You see polish, not stress.
            That mood is the brief: arrive looking like you love being there.
          </p>
          <Note title="Try this at home">
            Choose one color that sparks joy. Build everything else to support
            it. Smile with your styling—let one element be charming.
          </Note>
        </section>

        {/* 2) Palette */}
        <section aria-labelledby="palette" className="mb-10">
          <h2 id="palette" className="font-serif text-2xl tracking-tight">
            2) Palette: saturated brights with refined neutrals
          </h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-7 text-neutral-700">
            <li>
              <strong>Hero hues:</strong> emerald, cobalt, fuchsia, marigold.
            </li>
            <li>
              <strong>Grounding tones:</strong> cream, bone, soft tan, ink.
            </li>
            <li>
              <strong>Metal:</strong> warm gold or champagne; keep to one metal
              family for cohesion.
            </li>
          </ul>
        </section>

        {/* 3) Silhouette */}
        <section aria-labelledby="silhouette" className="mb-10">
          <h2 id="silhouette" className="font-serif text-2xl tracking-tight">
            3) Silhouette: fitted through the torso, ease in the sweep
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            The Blake ratio favors a defined torso with movement below: a
            fitted sheath with a statement coat, or a corset top with an A-line
            skirt. Lines read clean and upright—no over-styling, just clarity.
          </p>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-neutral-900">
              Body-type notes
            </p>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-[15px] leading-7 text-neutral-700">
              <li>
                <strong>Pear:</strong> broaden shoulder with a structured neckline
                or cropped jacket; keep color focus up top or even throughout.
              </li>
              <li>
                <strong>Hourglass:</strong> softly defined waist; avoid rigid
                cinches—let the fabric shape.
              </li>
              <li>
                <strong>Apple:</strong> empire or wrap torso with fluid skirt; a
                longline coat elongates.
              </li>
              <li>
                <strong>Rectangle:</strong> add curve via peplum, bias, or
                sweetheart neckline; choose a twirl-friendly skirt.
              </li>
            </ul>
          </div>
        </section>

        {/* 4) Finishing */}
        <section aria-labelledby="finishing" className="mb-10">
          <h2 id="finishing" className="font-serif text-2xl tracking-tight">
            4) Finishing: sparkle, statement coat, sleek heel
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Blake loves a coat that plays lead—capelets, embellished trenches,
            glossy tweed. Jewelry glints without clutter: sculptural gold, a
            single cuff, or chandelier drops. Shoes stay sleek—pointed pump or
            strappy sandal—to preserve the line.
          </p>
          <Note title="Stylist’s cue">
            If the coat is the star, keep the dress minimal. If the dress sings,
            let jewelry carry the sparkle and keep outerwear simple.
          </Note>
        </section>

        {/* 5) Recipe */}
        <section aria-labelledby="recipe" className="mb-12">
          <h2 id="recipe" className="font-serif text-2xl tracking-tight">
            5) Quick recipe (copy-paste)
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-neutral-700">
            <li>Fitted dress or corset + A-line/bias skirt.</li>
            <li>Statement coat or capelet for movement and drama.</li>
            <li>Sleek heel: pointed pump or fine-strap sandal.</li>
            <li>Jewelry: one sparkling moment; stick to one metal.</li>
            <li>Bag: compact top-handle or minaudière.</li>
            <li>Palette: one joyful color, refined neutrals around it.</li>
          </ol>
        </section>

        {/* 6) Brand tie-in + CTA */}
        <section aria-labelledby="make-it-yours" className="mb-12">
          <h2 id="make-it-yours" className="font-serif text-2xl tracking-tight">
            6) Make it yours—the RunwayTwin way
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">
            Give our stylist your brief—“Blake Lively occasion glam, wedding
            guest, mid budget”—and get a complete look in minutes, adapted to
            your size, body type, and EU/US stock. Maximum entrance, minimum
            guesswork.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-tight">
              Ready to make an entrance?
            </h3>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              Upload a muse, set your budget, and receive a polished head-to-toe
              plan—color, silhouette, finishing—tailored to you.
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
                Polished ease, candlelit palette, decisive structure.
              </p>
            </article>

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
                Oversized balance, bold accessories, confident outerwear.
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
