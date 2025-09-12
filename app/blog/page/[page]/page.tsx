// app/blog/page/[page]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

type Params = { page: string };

export const metadata: Metadata = {
  title: "Style Journal — Page — RunwayTwin",
  description:
    "Celebrity style decoded into wearable formulas. Capsules, fit guides, and shoppable edits — curated for real life and real budgets.",
};

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

export default function BlogPagePaginated({ params }: { params: Params }) {
  const pageSize = 6; // 6 posts per page
  const pageIndex = Math.max(1, Number(params.page) || 1);
  const total = ALL_POSTS.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (pageIndex - 1) * pageSize;
  const end = start + pageSize;
  const items = ALL_POSTS.slice(start, end);

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      <Header />

      {/* HERO */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-6">
          <h1 className="font-serif text-3xl tracking-tight sm:text-[40px]">
            Style Journal — Page {pageIndex}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-700">
            Celebrity formulas, capsules, fit science and shoppable edits — curated for real life.
          </p>
        </div>
      </section>

      {/* GRID */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        {items.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {items.map((p) => (
              <PostCard key={p.href} {...p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
            No posts on this page yet.
          </div>
        )}

        {/* Pagination controls */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <Link
            href={pageIndex > 1 ? `/blog/page/${pageIndex - 1}` : "/blog"}
            className="inline-flex h-8 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
          >
            ← Prev
          </Link>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const active = n === pageIndex;
            return (
              <Link
                key={n}
                href={n === 1 ? "/blog" : `/blog/page/${n}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
                }`}
              >
                {n}
              </Link>
            );
          })}
          <Link
            href={
              pageIndex < totalPages ? `/blog/page/${pageIndex + 1}` : `/blog/page/${totalPages}`
            }
            className="inline-flex h-8 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-sm hover:bg-neutral-50"
          >
            Next →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
