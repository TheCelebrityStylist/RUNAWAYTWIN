// app/blog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* =============================================================================
   RunwayTwin — Blog (Editorial Grid • SEO Rich • Mobile-First)
   - Server Component only (no "use client")
   - Sticky header + luxury footer (matches Home/Pricing/About)
   - Sections: Hero, Category chips, Featured posts, Latest grid, Newsletter,
     CTA, Footer
   - JSON-LD: Blog + Breadcrumb + CollectionPage
   - Tailwind CSS expected
   ============================================================================= */

export const metadata: Metadata = {
  title: "Style Journal — RunwayTwin │ Celebrity Formulas, Capsules, Fit Guides",
  description:
    "Celebrity style decoded into wearable formulas. Capsules, body-type fit guides, and shoppable edits — curated for real life and real budgets.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog" },
  openGraph: {
    title: "Style Journal — RunwayTwin",
    description:
      "From Zendaya evening glam to Rihanna street luxe — editor-level guides with shoppable pieces.",
    url: "https://runwaytwin.vercel.app/blog",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Style Journal — RunwayTwin",
    description:
      "Celebrity formulas decoded. Capsules, occasion dressing, budget-true shopping links.",
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

function Chip({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm ${
        active
          ? "bg-black text-white"
          : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function PostCard({
  href,
  title,
  summary,
  eyebrow,
  readingTime = "4 min",
}: {
  href: string;
  title: string;
  summary: string;
  eyebrow?: string;
  readingTime?: string;
}) {
  return (
    <article className="group rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm transition hover:shadow-md">
      {eyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-1 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{summary}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span>{readingTime} read</span>
        <Link
          href={href}
          className="text-neutral-900 underline underline-offset-4 group-hover:no-underline"
          aria-label={`Read: ${title}`}
        >
          Read →
        </Link>
      </div>
    </article>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function BlogPage() {
  // Static “featured” and “latest” placeholders.
  // When you add MDX posts or a CMS, map them into these cards.
  const featured = [
    {
      href: "/blog/zendaya-evening-glam",
      title: "Zendaya Evening Glam: Sculpted Shoulders, Liquid Shine",
      summary:
        "Her signature strong-shoulder + column silhouette, decoded. Shop the exact vibe at mid and high-street prices.",
      eyebrow: "Celebrity Formula",
      readingTime: "6 min",
    },
    {
      href: "/blog/rihanna-street-luxe",
      title: "Rihanna Street Luxe: Oversize Outerwear, Pointed Boots",
      summary:
        "Layering, proportion play and texture contrast — a step-by-step to nail that off-duty edge.",
      eyebrow: "Celebrity Formula",
      readingTime: "5 min",
    },
  ];

  const latest = [
    {
      href: "/blog/jennifer-lawrence-work-minimalism",
      title: "Jennifer Lawrence Work Minimalism: Clean Lines that Work Hard",
      summary:
        "Neutral palette, wide-leg trousers, sleek leather accents. Wear-to-work looks that feel quietly expensive.",
      eyebrow: "Capsule",
    },
    {
      href: "/blog/pear-body-denim-guide",
      title: "Pear-Shape Denim: Rises, Lengths & Fits that Flatter",
      summary:
        "The science of balance: shoulder structure up top, float below. Exact jeans that love pear proportions.",
      eyebrow: "Fit Guide",
    },
    {
      href: "/blog/evening-bags-under-120",
      title: "Evening Bags Under €120 that Look Luxe",
      summary:
        "Satin, metal hardware and clean geometry. Small bags that lift any outfit, without lifting your budget.",
      eyebrow: "Shopping Edit",
    },
    {
      href: "/blog/work-essentials-checklist",
      title: "Work Essentials: A 10-Piece Capsule That Mixes & Matches",
      summary:
        "Tailored blazer, ivory knit, pointed flats — the matrix for months of no-stress outfits.",
      eyebrow: "Capsule",
    },
    {
      href: "/blog/travel-capsule-weekend",
      title: "Weekend Travel Capsule: 8 Pieces, 12 Outfits",
      summary:
        "Carry-on only. Fabrics that don’t crease, layers that still read polished.",
      eyebrow: "Capsule",
    },
    {
      href: "/blog/finding-your-neutral-palette",
      title: "Find Your Neutral Palette: Ivory, Taupe, Charcoal, Black",
      summary:
        "Which neutrals flatter your undertone — and how to combine them for expensive-looking outfits.",
      eyebrow: "Theory",
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ============================ JSON-LD (rich results) ============================ */}
      <script
        type="application/ld+json"
        // Blog
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "RunwayTwin Style Journal",
            url: "https://runwaytwin.vercel.app/blog",
            description:
              "Celebrity style decoded into wearable formulas. Capsules, body-type fit guides, and budget-true shopping edits.",
          }),
        }}
      />
      <script
        type="application/ld+json"
        // CollectionPage + Breadcrumb
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "RunwayTwin Style Journal",
            url: "https://runwaytwin.vercel.app/blog",
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
                  name: "Blog",
                  item: "https://runwaytwin.vercel.app/blog",
                },
              ],
            },
          }),
        }}
      />

      {/* ================================ Sticky Header ================================ */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-[#FAF9F6]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="group flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-black text-[11px] font-semibold text-white">
              RT
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">RunwayTwin</div>
              <div className="text-[11px] text-neutral-500">
                Be Their Runway Twin ✨
              </div>
            </div>
          </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 text-[14px]">
            <Link href="/stylist" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">Stylist</Link>
            <Link href="/about" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">About</Link>
            <Link href="/blog" aria-current="page" className="rounded-full px-3 py-2 font-medium text-neutral-900 underline-offset-4 hover:underline">Blog</Link>
            <Link href="/pricing" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">Pricing</Link>
            <Link href="/stylist" className="ml-2 inline-flex items-center rounded-full bg-black px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90">Start Styling</Link>
          </nav>
        </div>
      </header>

      {/* ================================== HERO =================================== */}
      <section aria-labelledby="hero-title" className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>Celebrity Formulas</Badge>
            <Badge>Capsules</Badge>
            <Badge>Fit Guides</Badge>
            <Badge>Under-Your-Budget</Badge>
            <Badge>EU/US Stock</Badge>
          </div>

          <h1 id="hero-title" className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px] md:text-[56px]">
            Style Journal — <span className="text-[hsl(27_65%_42%)]">learn the formula.</span>
          </h1>
          <p className="mt-5 max-w-3xl text-[15px] leading-7 text-neutral-700">
            Celebrity signatures decoded into outfits you’ll actually wear — plus capsules,
            fit science and shoppable edits inside your budget.
          </p>
        </div>
      </section>

      {/* =============================== Category Chips ============================== */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="flex flex-wrap gap-2">
          <Chip href="/blog" label="All" active />
          <Chip href="/blog/category/celebrity-formulas" label="Celebrity Formulas" />
          <Chip href="/blog/category/capsule" label="Capsule" />
          <Chip href="/blog/category/fit-guides" label="Fit Guides" />
          <Chip href="/blog/category/shopping-edits" label="Shopping Edits" />
          <Chip href="/blog/category/theory" label="Theory" />
        </div>
      </section>

      {/* ================================== Featured ================================== */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <h2 className="text-2xl font-semibold tracking-tight">Featured</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {featured.map((p) => (
            <PostCard key={p.href} {...p} />
          ))}
        </div>
      </section>

      {/* =================================== Latest =================================== */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Latest</h2>
          <Link className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900" href="/blog" aria-label="Refresh">
            Refresh
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {latest.map((p) => (
            <PostCard key={p.href} {...p} />
          ))}
        </div>

        {/* Simple static pagination placeholder — replace when wired to CMS */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm">1</span>
          <Link href="/blog/page/2" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm hover:bg-neutral-50">2</Link>
          <Link href="/blog/page/3" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm hover:bg-neutral-50">3</Link>
          <Link href="/blog/page/2" className="ml-2 text-sm underline underline-offset-4">Next →</Link>
        </div>
      </section>

      {/* ================================= Newsletter ================================ */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Stay on the guest list</p>
              <p className="mt-1 text-sm text-neutral-700">
                Monthly drops: celebrity formulas decoded + capsule cheatsheets.
              </p>
            </div>
            <form
              action="https://example.com/subscribe"
              method="post"
              className="flex w-full max-w-md gap-2"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-800"
              />
              <button
                type="submit"
                className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ================================= Final CTA ================================ */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Ready to wear the vibe?</p>
              <p className="mt-1 text-sm text-neutral-700">
                Drop a muse and get an editorial-grade look in minutes.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/stylist" className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
                Try the Stylist
              </Link>
              <Link href="/pricing" className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50">
                See Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================================== Footer ================================= */}
      <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="grid grid-cols-1 gap-8 text-sm text-neutral-700 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <p className="font-semibold">RunwayTwin</p>
              <p className="mt-2 max-w-xs text-neutral-600">
                Celebrity stylist AI — editorial looks, budget-true picks, live EU/US stock.
              </p>
              <p className="mt-3 text-[12px] leading-5 text-neutral-500">
                Disclosure: some outbound links are affiliate links; we may earn a
                commission at no extra cost to you.
              </p>
            </div>
            <nav aria-label="Product">
              <p className="font-semibold">Product</p>
              <ul className="mt-2 space-y-2">
                <li><Link className="hover:underline" href="/stylist">Stylist</Link></li>
                <li><Link className="hover:underline" href="/pricing">Pricing</Link></li>
                <li><Link className="hover:underline" href="/blog" aria-current="page">Blog</Link></li>
              </ul>
            </nav>
            <nav aria-label="Company">
              <p className="font-semibold">Company</p>
              <ul className="mt-2 space-y-2">
                <li><Link className="hover:underline" href="/about">About</Link></li>
                <li><Link className="hover:underline" href="/contact">Contact</Link></li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <p className="font-semibold">Legal</p>
              <ul className="mt-2 space-y-2">
                <li><Link className="hover:underline" href="/affiliate-disclosure">Affiliate Disclosure</Link></li>
                <li><Link className="hover:underline" href="/privacy">Privacy</Link></li>
                <li><Link className="hover:underline" href="/terms">Terms</Link></li>
              </ul>
            </nav>
          </div>
          <p className="mt-8 text-xs text-neutral-500">
            © {new Date().getFullYear()} RunwayTwin — All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}


