import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Blog Index (Ultra-Premium • Storytelling • SEO & CRO tuned)
   - Server Component only (no 'use client')
   - Featured posts row + editorial cards
   - Server-friendly filters via URL params (?q=&category=&tag=)
   - Tag cloud, Most Read, Category grid, FAQ rich snippet, Newsletter teaser
   - JSON-LD: Blog + ItemList + BreadcrumbList + FAQPage
   ========================================================================= */

export const metadata: Metadata = {
  title: "RunwayTwin Journal — Celebrity Style Guides & Outfit Formulas",
  description:
    "Editorial, story-driven guides that decode celebrity signatures into wearable outfit formulas. Palettes, silhouettes, body-type notes, and copy-paste recipes.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog" },
  keywords: [
    "celebrity style guide",
    "Zendaya evening glam",
    "Rihanna street luxe",
    "Jennifer Lawrence minimalism",
    "Blake Lively occasion glam",
    "outfit formulas",
    "AI stylist",
    "capsule wardrobe",
  ],
  openGraph: {
    title: "RunwayTwin Journal — Celebrity Style Guides & Outfit Formulas",
    description:
      "From Zendaya evening glam to Rihanna street luxe: premium guides that translate runway energy into real-life outfits.",
    url: "https://runwaytwin.vercel.app/blog",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RunwayTwin Journal — Celebrity Style Guides & Outfit Formulas",
    description:
      "Wearable celebrity style, decoded. Story-first guides with palettes, silhouettes, and quick recipes.",
  },
};

/* --------------------------------- Data ---------------------------------- */

type Post = {
  slug: string;
  title: string;
  intro: string;
  category: "Evening" | "Street Luxe" | "Minimalism" | "Occasion";
  tags: string[];
  featured?: boolean;
  readMins: number;
};

const POSTS: Post[] = [
  {
    slug: "zendaya-evening-glam",
    title: "Zendaya Evening Glam — the wearable formula",
    intro:
      "Polished ease, candlelit palette, decisive structure. A repeatable recipe for elevated nights.",
    category: "Evening",
    tags: ["Zendaya", "Evening", "Column Dress", "Satin", "Heels"],
    featured: true,
    readMins: 8,
  },
  {
    slug: "rihanna-street-luxe",
    title: "Rihanna Street Luxe — volume, edge, easy drama",
    intro:
      "Oversized outerwear, crop + wide leg, bold finishing—without drowning the frame.",
    category: "Street Luxe",
    tags: ["Rihanna", "Streetwear", "Bomber", "Denim", "Hardware"],
    featured: true,
    readMins: 7,
  },
  {
    slug: "jennifer-lawrence-off-duty",
    title: "Jennifer Lawrence Off-Duty — sleek, pointed, effortless",
    intro:
      "Neutral palette, clean tailoring, pointed shoes. A weekday-proof capsule that actually works.",
    category: "Minimalism",
    tags: ["Jennifer Lawrence", "Minimalism", "Blazer", "Workwear", "Capsule"],
    readMins: 7,
  },
  {
    slug: "blake-lively-occasion-glam",
    title: "Blake Lively Occasion Glam — color play, polish, joyful drama",
    intro:
      "Sculpted fit, saturated color, sparkle where it counts. Turn invitations into entrances.",
    category: "Occasion",
    tags: ["Blake Lively", "Wedding Guest", "Color", "Statement Coat"],
    featured: true,
    readMins: 9,
  },
];

/* ------------------------------- UI atoms -------------------------------- */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/70 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

function Chip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-50"
    >
      {children}
    </Link>
  );
}

function Card({
  title,
  intro,
  href,
  eyebrow,
  readMins,
}: {
  title: string;
  intro: string;
  href: string;
  eyebrow: string;
  readMins: number;
}) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {eyebrow} • {readMins} min read
      </p>
      <h3 className="mt-1 text-base font-semibold text-neutral-900">
        <Link href={href} className="hover:underline">
          {title}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{intro}</p>
      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          aria-label={`Read ${title}`}
        >
          Read guide
        </Link>
      </div>
    </article>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function Page({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string; tag?: string; page?: string };
}) {
  const q = (searchParams?.q || "").toLowerCase().trim();
  const cat = (searchParams?.category || "").toLowerCase().trim();
  const tag = (searchParams?.tag || "").toLowerCase().trim();
  const page = Math.max(1, parseInt(searchParams?.page || "1", 10));
  const perPage = 6;

  const filtered = POSTS.filter((p) => {
    const inCategory = cat ? p.category.toLowerCase() === cat : true;
    const inTag = tag ? p.tags.map((t) => t.toLowerCase()).includes(tag) : true;
    if (!q) return inCategory && inTag;
    const hay = [
      p.title.toLowerCase(),
      p.intro.toLowerCase(),
      p.category.toLowerCase(),
      p.tags.join(" ").toLowerCase(),
    ].join(" ");
    return inCategory && inTag && hay.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pageItems = filtered.slice(start, end);

  const featured = POSTS.filter((p) => p.featured);

  const url = "https://runwaytwin.vercel.app/blog";

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ============================ JSON-LD (Blog + Items + Breadcrumbs + FAQ) ============================ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://runwaytwin.vercel.app/" },
              { "@type": "ListItem", position: 2, name: "Blog", item: url },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "RunwayTwin Journal",
            url,
            description:
              "Story-driven celebrity style guides translated into wearable outfit formulas.",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: POSTS.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://runwaytwin.vercel.app/blog/${p.slug}`,
              name: p.title,
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Do your guides work for all body types?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. Each guide includes silhouette logic for pear, hourglass, apple, and rectangle so outfits flatter by design.",
                },
              },
              {
                "@type": "Question",
                name: "Can I stick to my budget?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Absolutely. Our stylist curates within high-street, mid or luxury bands and keeps carts in-range.",
                },
              },
              {
                "@type": "Question",
                name: "Is stock localized for EU/US?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. We account for region so sizes, currency, and retailers make sense for EU/US shoppers.",
                },
              },
            ],
          }),
        }}
      />

      {/* ================================ Hero ================================ */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge>Editorial</Badge>
          <Badge>Body-Type Notes</Badge>
          <Badge>Copy-Paste Recipes</Badge>
          <Badge>Capsule-Friendly</Badge>
        </div>
        <h1 className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
          RunwayTwin Journal
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-7 text-neutral-700">
          Premium, story-driven guides that decode celebrity signatures into{" "}
          <span className="font-medium">wearable</span> formulas—palettes,
          silhouettes and finishing you can apply tomorrow.
        </p>
      </section>

      {/* ============================== Featured ============================== */}
      <section className="mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {featured.map((p) => (
            <article
              key={p.slug}
              className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Featured • {p.category} • {p.readMins} min read
              </p>
              <h3 className="mt-1 text-base font-semibold text-neutral-900">
                <Link href={`/blog/${p.slug}`} className="hover:underline">
                  {p.title}
                </Link>
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{p.intro}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.tags.slice(0, 3).map((t) => (
                  <Chip key={t} href={`/blog?tag=${encodeURIComponent(t)}`}>{t}</Chip>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  href={`/blog/${p.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Read guide
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ========================= Filters + Search ========================= */}
      <section className="mx-auto max-w-6xl px-5 pt-8">
        <form
          method="GET"
          action="/blog"
          className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
          aria-label="Filter and search articles"
        >
          {/* Category */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-neutral-600">Category</label>
            <select
              name="category"
              defaultValue={searchParams?.category || ""}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="Evening">Evening</option>
              <option value="Street Luxe">Street Luxe</option>
              <option value="Minimalism">Minimalism</option>
              <option value="Occasion">Occasion</option>
            </select>
          </div>

          {/* Tag */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-neutral-600">Tag</label>
            <select
              name="tag"
              defaultValue={searchParams?.tag || ""}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {[...new Set(POSTS.flatMap((p) => p.tags))].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex flex-1 items-center gap-2">
            <label htmlFor="q" className="text-xs font-medium text-neutral-600">
              Search
            </label>
            <input
              id="q"
              name="q"
              placeholder="e.g., ‘Zendaya’, ‘wedding guest’, ‘wide-leg’"
              defaultValue={searchParams?.q || ""}
              className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Apply
            </button>
            <Link
              href="/blog"
              className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* =============================== Results =============================== */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        {pageItems.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
            No results. Try “Zendaya”, “Rihanna”, “Minimalism”, or “Occasion”.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pageItems.map((p) => (
              <Card
                key={p.slug}
                title={p.title}
                intro={p.intro}
                href={`/blog/${p.slug}`}
                eyebrow={p.category}
                readMins={p.readMins}
              />
            ))}
          </div>
        )}

        {/* Pagination (static, crawlable) */}
        {totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-8 flex items-center justify-center gap-2"
          >
            {Array.from({ length: totalPages }).map((_, i) => {
              const n = i + 1;
              const search = new URLSearchParams({
                ...(q ? { q } : {}),
                ...(cat ? { category: searchParams?.category! } : {}),
                ...(tag ? { tag: searchParams?.tag! } : {}),
                page: String(n),
              }).toString();
              const href = `/blog?${search}`;
              const active = n === page;
              return (
                <Link
                  key={n}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    active
                      ? "bg-black text-white"
                      : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  {n}
                </Link>
              );
            })}
          </nav>
        )}
      </section>

      {/* =========================== Category Grid =========================== */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <h2 className="text-2xl font-semibold tracking-tight">Explore by category</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {["Evening", "Street Luxe", "Minimalism", "Occasion"].map((c) => (
            <Link
              key={c}
              href={`/blog?category=${encodeURIComponent(c)}`}
              className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Category
              </p>
              <p className="mt-1 font-semibold">{c}</p>
              <p className="mt-1 text-neutral-600">
                {POSTS.filter((p) => p.category === (c as any)).length} guide(s)
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================ Most Read / Tags ============================ */}
      <section className="mx-auto max-w-6xl grid grid-cols-1 gap-6 px-5 pb-10 md:grid-cols-3">
        {/* Most Read (simple ranking: featured first, then read mins desc) */}
        <div className="md:col-span-2">
          <h2 className="text-2xl font-semibold tracking-tight">Most read</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {POSTS.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.readMins - a.readMins)
              .slice(0, 4)
              .map((p) => (
                <article
                  key={p.slug}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    {p.category} • {p.readMins} min read
                  </p>
                  <h3 className="mt-1 text-base font-semibold">
                    <Link href={`/blog/${p.slug}`} className="hover:underline">
                      {p.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-neutral-700">{p.intro}</p>
                </article>
              ))}
          </div>
        </div>

        {/* Tag Cloud */}
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">Popular tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...new Set(POSTS.flatMap((p) => p.tags))]
              .sort((a, b) => a.localeCompare(b))
              .map((t) => (
                <Chip key={t} href={`/blog?tag=${encodeURIComponent(t)}`}>
                  {t}
                </Chip>
              ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Tip: tags sharpen results for specific silhouettes, palettes, or muses.
          </p>
        </aside>
      </section>

      {/* ============================= Newsletter ============================= */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <p className="text-lg font-semibold">Join the style list</p>
              <p className="mt-1 text-sm text-neutral-700">
                New celebrity formulas, capsule tricks, and shopping notes—one elegant email a week.
              </p>
            </div>
            {/* Static form (no backend yet) */}
            <form
              action="/thank-you"
              method="GET"
              className="flex w-full items-center gap-2 md:justify-end"
              aria-label="Subscribe to newsletter"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm md:w-auto"
              />
              <button
                type="submit"
                className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ================================ Final CTA ================================ */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Ready to turn inspo into outfits?</p>
              <p className="mt-1 text-sm text-neutral-700">
                Tell our stylist your muse, budget and occasion—get a head-to-toe plan in minutes.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/stylist"
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
              >
                ✨ Try the Stylist
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
              >
                See Plans
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-500">
          Some outbound retailer links across the site may be affiliate; we may earn a commission at no extra cost to you.
        </p>
      </section>
    </main>
  );
}

