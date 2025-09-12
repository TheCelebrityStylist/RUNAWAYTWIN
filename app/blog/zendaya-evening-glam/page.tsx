import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   Blog: Zendaya Evening Glam — Story-Driven Style Guide (SEO + CRO)
   - Server component (no client hooks)
   - Rich storytelling with clear sections, scannable H2/H3s, and internal links
   - JSON-LD Article for rich results
   - Premium CTA block (tactile, conversion-optimized)
   - Mobile-first, accessibility-friendly
   ========================================================================= */

export const metadata: Metadata = {
  title:
    "Zendaya Evening Glam: The Wearable Formula (Colors, Silhouette & Styling) — RunwayTwin",
  description:
    "Decode Zendaya’s evening look into a wearable, body-type friendly formula. Learn palettes, silhouettes, and finishing touches you can apply tonight. Editorial guidance by RunwayTwin.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam" },
  keywords: [
    "Zendaya outfits",
    "Zendaya evening outfit",
    "celebrity style guide",
    "how to dress like Zendaya",
    "AI stylist",
    "editorial styling",
    "capsule wardrobe evening",
    "body type flattering outfits",
  ],
  openGraph: {
    title:
      "Zendaya Evening Glam: The Wearable Formula — RunwayTwin Style Guide",
    description:
      "From red-carpet atmospherics to real-life elegance: the colors, shapes and finishing touches of Zendaya’s evening glam, translated into pieces you’ll actually wear.",
    url: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
    siteName: "RunwayTwin",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Zendaya Evening Glam: The Wearable Formula — RunwayTwin Style Guide",
    description:
      "A clear, body-type aware breakdown of Zendaya’s signature evening style, turned into actionable, shoppable rules.",
  },
};

/* --------------------------------- Helpers -------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </p>
  );
}

function Aside({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-700 shadow-sm">
      <p className="font-semibold text-neutral-900">{title}</p>
      <div className="mt-2">{children}</div>
    </aside>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function Page() {
  return (
    <main className="bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* JSON-LD Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "Zendaya Evening Glam: The Wearable Formula (Colors, Silhouette & Styling)",
            description:
              "Decode Zendaya’s evening look into a wearable, body-type friendly formula. Learn palettes, silhouettes, and finishing touches you can apply tonight.",
            author: { "@type": "Organization", name: "RunwayTwin" },
            publisher: {
              "@type": "Organization",
              name: "RunwayTwin",
              logo: {
                "@type": "ImageObject",
                url: "https://runwaytwin.vercel.app/icon.png",
              },
            },
            mainEntityOfPage:
              "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
          }),
        }}
      />

      {/* Top bar breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-3xl px-5 pt-6 text-sm text-neutral-600"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link className="hover:underline" href="/">
              Home
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link className="hover:underline" href="/blog">
              Blog
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-neutral-900">Zendaya Evening Glam</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-3xl px-5 pb-4 pt-8">
        <Eyebrow>Style Guide · Editorial</Eyebrow>
        <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px] md:text-[52px]">
          Zendaya Evening Glam — the wearable formula
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-neutral-700">
          Zendaya’s red-carpet magic isn’t just the dress; it’s the **structure**:
          a focused palette, an intentional silhouette, and a few impeccable
          finishing touches. Below, we translate that signature into a **repeatable
          outfit recipe** you can use for dinners, dates, premieres, or any
          night that deserves a little cinema.
        </p>
      </header>

      {/* Cover visual placeholder (optional image slot) */}
      <div className="mx-auto max-w-5xl px-5">
        <div className="h-56 w-full rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 shadow-sm sm:h-72 md:h-80" />
      </div>

      {/* Article Body */}
      <article className="mx-auto max-w-3xl px-5 py-10">
        <section className="prose prose-neutral max-w-none prose-headings:font-serif prose-h2:tracking-tight prose-p:leading-7">
          <h2>1) The mood: polished ease, not costume</h2>
          <p>
            What makes Zendaya feel modern is restraint. Every look has room to
            breathe: **one statement** at a time, framed by quiet, deliberate
            choices. You’ll rarely see a clash of focal points. Instead, she
            chooses a single hero — silhouette, color, or texture — and lets it
            carry the room.
          </p>
          <Aside title="Try this at home">
            <ul className="list-disc pl-5">
              <li>Pick a single hero: neckline, fabric, or cut.</li>
              <li>Strip the rest back to clean lines and calm color.</li>
              <li>Let the tailoring do the talking.</li>
            </ul>
          </Aside>

          <h2>2) Palette: deep neutrals, wet metallics, candlelit skin</h2>
          <p>
            Her evening palette lives between **ink black, tobacco brown,
            gunmetal, champagne, and bronze** — occasionally punched by a
            sculptural white or a mood-rich burgundy. Skin reads dewy and
            luminous, which is why fabrics that catch and release light (satin,
            liquid silk, polished leather) are so effective.
          </p>
          <ul>
            <li>
              <strong>Core neutrals:</strong> black, espresso, bone, slate.
            </li>
            <li>
              <strong>Metal notes:</strong> brushed gold, old-silver,
              champagne.
            </li>
            <li>
              <strong>Accent (optional):</strong> deep cherry, oxblood,
              night-navy.
            </li>
          </ul>

          <h2>3) Silhouette: long line + decisive structure</h2>
          <p>
            Evening Zendaya is **elongated**. Think column dresses, fluid
            wide-leg trousers with a tucked bodice, or a long pencil skirt with
            a sharp shoulder. The goal is vertical intent — a line that moves
            from collarbone to hem with confidence.
          </p>

          <h3>Body-type notes</h3>
          <ul>
            <li>
              <strong>Pear:</strong> balance the hip with a clean shoulder.
              Tucked draped blouses and straight maxi skirts work beautifully.
            </li>
            <li>
              <strong>Hourglass:</strong> honor the waist without squeezing:
              soft corsetry, bias cuts, wrap details.
            </li>
            <li>
              <strong>Apple:</strong> extend the line: V-neck columns, long
              blazers, minimal waist cinch.
            </li>
            <li>
              <strong>Rectangle:</strong> add dynamic curves via bias, peplum,
              or an architectural shoulder.
            </li>
          </ul>

          <h2>4) The finishing trio: jewelry · bag · shoe</h2>
          <p>
            Zendaya’s styling reads like a perfect sentence: **one clause, three
            words**. Jewelry is structural (a cuff, a clean drop, a sculptural
            hoop). Bags are compact, almost architectural. Shoes are sleek —
            point or barely-there sandal — to preserve the line.
          </p>

          <Aside title="Stylist’s cue">
            Keep the verbs quiet: polish, taper, elongate. If an accessory
            shouts, take something else off.
          </Aside>

          <h2>5) Your evening formula (copy-paste)</h2>
          <p>
            Below is a ready recipe you can apply tonight. Adjust color to your
            palette and swap silhouettes per your body-type notes above.
          </p>
          <ol className="list-decimal pl-5">
            <li>
              <strong>Top:</strong> sculpted bodice, draped blouse, or liquid
              knit with a defined neckline.
            </li>
            <li>
              <strong>Bottom:</strong> column skirt, tailored maxi, or fluid
              wide-leg trouser.
            </li>
            <li>
              <strong>Layer (optional):</strong> long blazer or cropped
              structured jacket.
            </li>
            <li>
              <strong>Shoe:</strong> pointed pump or minimalist sandal.
            </li>
            <li>
              <strong>Jewelry:</strong> one statement shape; keep metal
              consistent.
            </li>
            <li>
              <strong>Bag:</strong> compact clutch or micro-top-handle.
            </li>
          </ol>

          <h2>6) Make it yours (the RunwayTwin way)</h2>
          <p>
            At <Link href="/" className="underline">RunwayTwin</Link>, we built our AI stylist on this idea:
            decode a celebrity signature into **wearable formulas** that respect
            **your body type, your budget, and your region (EU/US stock)**.
            Describe your muse — “Zendaya, evening, mid budget” — and get a
            complete outfit blueprint in minutes.
          </p>
        </section>

        {/* —— Upgraded CTA Block (premium + persuasive) —— */}
        <div className="mt-12 rounded-2xl border border-neutral-200 bg-white p-8 shadow-md sm:p-10">
          <h3 className="font-serif text-2xl font-semibold tracking-tight text-neutral-900">
            Want Zendaya-level styling — tailored to you?
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-700">
            Upload a muse, set your budget, and let our AI craft a complete
            evening formula in minutes — adjusted to your **body type** and
            **size**, with EU/US stock awareness. No endless scrolling. No
            guesswork. Just outfits that feel like you, only elevated.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/stylist"
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              aria-label="Try the AI Stylist"
            >
              ✨ Try the Stylist
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
              aria-label="See plans and pricing"
            >
              See Plans
            </Link>
          </div>

          <p className="mt-4 text-xs text-neutral-500">
            7-day money-back guarantee · Cancel anytime · EU/US coverage
          </p>
        </div>

        {/* Related links */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/blog/rihanna-street-luxe"
            className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm shadow-sm transition hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Next read
            </p>
            <p className="mt-1 font-medium text-neutral-900">
              Rihanna Street Luxe — volume, edge, and easy drama
            </p>
            <p className="mt-1 text-neutral-600">
              How to get the oversized energy without drowning the frame.
            </p>
          </Link>
          <Link
            href="/blog/jennifer-lawrence-off-duty"
            className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm shadow-sm transition hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Minimalism
            </p>
            <p className="mt-1 font-medium text-neutral-900">
              Jennifer Lawrence Off-Duty — sleek, pointed, effortless
            </p>
            <p className="mt-1 text-neutral-600">
              The clean capsule that carries you through the week.
            </p>
          </Link>
        </div>

        {/* Final nudge */}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/stylist"
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            Start Styling
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
          >
            Go Premium
          </Link>
        </div>
      </article>

      {/* Footer callout (simple disclosure) */}
      <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
        <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-neutral-600">
          Some outbound retailer links across the site may be affiliate; we
          may earn a small commission at no extra cost to you.
        </div>
      </footer>
    </main>
  );
}

