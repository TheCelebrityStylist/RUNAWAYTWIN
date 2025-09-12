// app/blog/category/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

type Params = { slug: string };

export const metadata: Metadata = {
  title: "Style Journal — Categories — RunwayTwin",
  description:
    "Celebrity formulas, capsules, fit guides, and shoppable edits — filtered by category.",
  robots: { index: true, follow: true },
};

const CATEGORY_LABELS: Record<string, string> = {
  "celebrity-formulas": "Celebrity Formulas",
  capsule: "Capsule",
  "fit-guides": "Fit Guides",
  "shopping-edits": "Shopping Edits",
  theory: "Theory",
};

// One source of truth for demo posts (same content used in pagination step)
const ALL_POSTS = [
  {
    href: "/blog/zendaya-evening-glam",
    title: "Zendaya Evening Glam: Sculpted Shoulders, Liquid Shine",
    summary:
      "Her strong-shoulder + column silhouette, decoded. Shop the exact vibe at mid and high-street prices.",
    eyebrow: "Celebrity Formula",
    readingTime: "6 min",
    category: "celebrity-formulas",
  },
  {
    href: "/blog/rihanna-street-luxe",
    title: "Rihanna Street Luxe: Oversize Outerwear, Pointed Boots",
    summary:
      "Layering, proportion play and texture contrast — step-by-step to nail that off-duty edge.",
    eyebrow: "Celebrity Formula",
    readingTime: "5 min",
    category: "celebrity-formulas",
  },
  {
    href: "/blog/jennifer-lawrence-work-minimalism",
    title: "Jennifer Lawrence Work Minimalism: Clean Lines that Work Hard",
    summary:
      "Neutral palette, wide-leg trousers, sleek leather accents. Wear-to-work looks that feel quietly expensive.",
    eyebrow: "Capsule",
    readingTime: "5 min",
    category: "capsule",
  },
  {
    href: "/blog/pear-body-denim-guide",
    title: "Pear-Shape Denim: Rises, Lengths & Fits that Flatter",
    summary:
      "Balance up top, float below. Exact jeans that love pear proportions (and why).",
    eyebrow: "Fit Guide",
    readingTime: "7 min",
    category: "fit-guides",
  },
  {
    href: "/blog/evening-bags-under-120",
    title: "Evening Bags Under €120 that Look Luxe",
    summary:
      "Satin, metal hardware and clean geometry. Small bags that lift any outfit without lifting your budget.",
    eyebrow: "Shopping Edit",
    readingTime: "4 min",
    category: "shopping-edits",
  },
  {
    href: "/blog/work-essentials-checklist",
    title: "Work Essentials: A 10-Piece Capsule That Mixes & Matches",
    summary:
      "Tailored blazer, ivory knit, pointed flats — the matrix for months of no-stress outfits.",
    eyebrow: "Capsule",
    readingTime: "6 min",
    category: "capsule",
  },
  {
    href: "/blog/travel-capsule-weekend",
    title: "Weekend Travel Capsule: 8 Pieces, 12 Outfits",
    summary:
      "Carry-on only. Fabrics that don’t crease, layers that still read polished.",
    eyebrow: "Capsule",
    readingTime: "5 min",
    category: "capsule",
  },
  {
    href: "/blog/finding-your-neutral-palette",
    title: "Find Your Neutral Palette: Ivory, Taupe, Charcoal, Black",
    summary:
      "Which neutrals flatter your undertone — and how to combine them for an expensive finish.",
    eyebrow: "Theory",
    readingTime: "5 min",
    category: "theory",
  },
];

/* ------------------------------- UI helpers ------------------------------- */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
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

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-[#FAF9F6]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-black text-[11px] font-semibold text-white">
            RT
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">RunwayTwin</div>
            <div className="text-[11px] text-neutral-500">Be Their Runway Twin ✨</div>
          </div>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 text-[14px]">
          <Link href="/stylist" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">Stylist</Link>
          <Link href="/about" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">About</Link>
          <Link href="/blog" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">Blog</Link>
          <Link href="/pricing" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">Pricing</Link>
          <Link href="/stylist" className="ml-2 inline-flex items-center rounded-full bg-black px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90">Start Styling</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid grid-cols-1 gap-8 text-sm text-neutral-700 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="font-semibold">RunwayTwin</p>
            <p className="mt-2 max-w-xs text-neutral-600">
              Celebrity stylist AI — editorial looks, budget-true picks, live EU/US stock.
            </p>
            <p className="mt-3 text-[12px] leading-5 text-neutral-500">
              Disclosure: some outbound links are affiliate links; we may earn a commission at no extra cost to you.
            </p>
          </div>
          <nav aria-label="Product">
            <p className="font-semibold">Product</p>
            <ul className="mt-2 space-y-2">
              <li><Link className="hover:underline" href="/stylist">Stylist</Link></li>
              <li><Link className="hover:underline" href="/pricing">Pricing</Link></li>
              <li><Link className="hover:underline" href="/blog">Blog</Link></li>
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
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function BlogCategoryPage({ params }: { params: Params }) {
  const slug = params.slug;
  const label = CATEGORY_LABELS[slug] ?? "All";
  const posts = ALL_POSTS.filter((p) => p.category === slug);

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      <Header />

      {/* HERO */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-6">
          <h1 className="font-serif text-3xl tracking-tight sm:text-[40px]">
            {label}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-700">
            Celebrity formulas, capsules, fit science and budget-true edits — filtered for you.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/blog" className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 hover:bg-neutral-50">
              All
            </Link>
            {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
              <Link
                key={key}
                href={`/blog/category/${key}`}
                aria-current={key === slug ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 ${
                  key === slug
                    ? "bg-black text-white"
                    : "border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                {val}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        {posts.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.href} {...p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
            Nothing in this category yet.
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/blog"
            className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
          >
            ← Back to Blog
          </Link>
          <Link
            href="/stylist"
            className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Try the Stylist
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
