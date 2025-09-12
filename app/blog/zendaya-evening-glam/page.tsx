import type { Metadata } from "next";
import Link from "next/link";

/* ============================================================================
   RunwayTwin Blog — Storytelling SEO Article
   - No product links, pure editorial storytelling
   - Magazine-style sections with narrative depth
   - Optimized H1/H2 hierarchy for SEO
   - Internal links for site structure (Stylist, Pricing, Blog)
   ============================================================================ */

export const metadata: Metadata = {
  title:
    "Zendaya Evening Glam — How to Capture Her Red Carpet Elegance │ RunwayTwin",
  description:
    "Discover Zendaya’s secret to timeless evening glamour: sculpted shoulders, liquid shine, and effortless confidence. A story-driven style guide to inspire your own wardrobe.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam" },
  openGraph: {
    title:
      "Zendaya Evening Glam — How to Capture Her Red Carpet Elegance │ RunwayTwin",
    description:
      "Zendaya’s evening looks balance structure, shine, and restraint. Learn the formula — and how to apply it to your own wardrobe.",
    url: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
    type: "article",
    siteName: "RunwayTwin",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Zendaya Evening Glam — How to Capture Her Red Carpet Elegance │ RunwayTwin",
    description:
      "From sculpted shoulders to liquid shine, Zendaya’s evening formula distilled into a story you can learn from.",
  },
  icons: { icon: "/favicon.ico" },
};

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-[#FAF9F6]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          RunwayTwin
        </Link>
        <nav className="flex gap-5 text-sm font-medium text-neutral-700">
          <Link href="/stylist">Stylist</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/blog" aria-current="page">Blog</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-neutral-600">
        <p className="font-semibold">RunwayTwin</p>
        <p className="mt-2 max-w-md">
          Celebrity stylist AI — turning inspiration into looks that fit your life.
        </p>
        <p className="mt-4 text-xs text-neutral-500">
          © {new Date().getFullYear()} RunwayTwin. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function ZendayaEveningPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900">
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pt-12 pb-6">
        <h1 className="font-serif text-4xl tracking-tight leading-tight">
          Zendaya Evening Glam: The Formula Behind Her Timeless Elegance
        </h1>
        <p className="mt-3 text-sm text-neutral-600">7 min read • Updated 2025</p>
      </section>

      {/* Storytelling */}
      <article className="mx-auto max-w-3xl px-5 prose prose-neutral">
        <h2>The Story</h2>
        <p>
          Zendaya has become a modern style icon not because of extravagance, but
          because of restraint. Her evening looks command attention without
          demanding it — sculpted shoulders, a long uninterrupted line, and one
          statement texture or shine. It’s the kind of glamour that feels both
          powerful and wearable.
        </p>

        <h2>The Formula</h2>
        <p>
          Her red-carpet looks follow a quiet formula: <strong>architecture</strong> at
          the shoulders, <strong>clarity</strong> through a column silhouette, and
          <strong> intrigue</strong> from a single plane of shine. By focusing on one
          idea at a time, Zendaya proves that simplicity is the ultimate luxury.
        </p>

        <blockquote>
          “Modern glamour is confidence in clean geometry — one line, one shimmer,
          zero fuss.”
        </blockquote>

        <h2>How You Can Translate It</h2>
        <p>
          The brilliance of this formula is its adaptability. A high-street satin
          skirt can give the same fluidity as a couture column gown. A structured
          blazer creates the same geometry as a custom atelier piece. The key is
          to focus on proportion and finish — not price tag.
        </p>

        <ul>
          <li>
            <strong>Pear:</strong> Emphasize shoulders with structure, keep the
            lower line clean.
          </li>
          <li>
            <strong>Hourglass:</strong> Define the waist with subtle tailoring,
            but maintain column flow.
          </li>
          <li>
            <strong>Apple:</strong> Use a longline jacket to balance proportions.
          </li>
          <li>
            <strong>Rectangle:</strong> Add curve with shaped shoulders and seams.
          </li>
        </ul>

        <h2>Why It Resonates</h2>
        <p>
          In a world of fast-changing trends, Zendaya’s evening formula resonates
          because it feels timeless. It’s a reminder that great style isn’t about
          chasing every micro-trend — it’s about choosing a few strong notes and
          letting them sing.
        </p>

        <p>
          At <Link href="/">RunwayTwin</Link>, we built our AI stylist on this
          principle: translating celebrity signatures into <em>wearable formulas</em>{" "}
          you can apply instantly, whether for work, evening, or everyday life.
        </p>

        {/* CTA */}
        <div className="mt-10 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Want Zendaya-level styling?</h3>
          <p className="mt-2 text-sm text-neutral-700">
            Upload a muse, set your budget, and get a complete outfit formula in
            minutes — tailored to you.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/stylist"
              className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Try the Stylist
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
            >
              See Plans
            </Link>
          </div>
        </div>
      </article>

      {/* Related */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-12">
        <h2 className="text-lg font-semibold">You might also enjoy</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/blog/rihanna-street-luxe"
            className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <div className="text-sm font-semibold">Rihanna Street Luxe</div>
            <p className="mt-1 text-xs text-neutral-600">
              Streetwear meets luxury storytelling.
            </p>
          </Link>
          <Link
            href="/blog/jennifer-lawrence-work-minimalism"
            className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <div className="text-sm font-semibold">J-Law Work Minimalism</div>
            <p className="mt-1 text-xs text-neutral-600">
              Neutral palettes and power tailoring.
            </p>
          </Link>
          <Link
            href="/blog/finding-your-neutral-palette"
            className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <div className="text-sm font-semibold">Find Your Neutrals</div>
            <p className="mt-1 text-xs text-neutral-600">
              A story on timeless tones.
            </p>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}


