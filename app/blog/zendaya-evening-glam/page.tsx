// app/blog/zendaya-evening-glam/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* ============================================================================
   Storytelling Article — Zendaya Evening Glam
   - Premium editorial tone + SEO keywords in H1/H2
   - Article & Breadcrumb JSON-LD
   - Sticky header + luxury footer (no client hooks)
   - Product blocks use stable search/category URLs (affiliate-ready later)
   ============================================================================ */

export const metadata: Metadata = {
  title:
    "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine (Wearable Formula) │ RunwayTwin",
  description:
    "Decode Zendaya’s evening glamour: sculpted shoulders, column silhouettes, liquid shine. Story-driven guide + shoppable picks at high-street, mid and luxury budgets.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam" },
  openGraph: {
    title:
      "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine (Wearable Formula)",
    description:
      "Editorial storytelling meets shoppable styling: the Zendaya look you can actually wear, within your budget.",
    url: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
    type: "article",
    siteName: "RunwayTwin",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine (Wearable Formula)",
    description:
      "Sculpted shoulders, column lines and liquid shine — distilled into a real-life outfit with links.",
  },
  icons: { icon: "/favicon.ico" },
};

/* --------------------------------- UI atoms -------------------------------- */

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose prose-neutral max-w-none prose-headings:tracking-tight prose-h2:text-neutral-900 prose-p:text-neutral-800 prose-strong:text-neutral-900 prose-li:marker:text-neutral-400">
      {children}
    </div>
  );
}

function Figure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <img src={src} alt={alt} className="h-auto w-full object-cover" />
      {caption ? (
        <figcaption className="px-4 py-3 text-xs text-neutral-600">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-800">
      “{children}”
    </blockquote>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
      {children}
    </div>
  );
}

function ProductRow({
  title,
  items,
}: {
  title: string;
  items: { name: string; priceHint?: string; retailer: string; href: string }[];
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map((p) => (
          <a
            key={p.href + p.name}
            href={p.href}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="rounded-xl border border-neutral-200 p-3 hover:bg-neutral-50"
          >
            <div className="text-sm font-medium">{p.name}</div>
            <div className="mt-1 text-xs text-neutral-600">
              {p.retailer}
              {p.priceHint ? ` • ${p.priceHint}` : ""}
            </div>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        Disclosure: some links may be affiliate; we may earn a commission at no
        extra cost to you.
      </p>
    </section>
  );
}

/* --------------------------------- Layout bits ------------------------------ */

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
          <Link href="/blog" aria-current="page" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">Blog</Link>
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

export default function ArticleZendayaPage() {
  // Replace with your hosted assets when ready
  const heroImg =
    "https://images.unsplash.com/photo-1520975922215-cad47f1fd85b?q=80&w=1600&auto=format&fit=crop";
  const detailImg =
    "https://images.unsplash.com/photo-1542060748-10c28b62716a?q=80&w=1600&auto=format&fit=crop";

  // WORKING CATEGORY/SEARCH LINKS (stable, not one-off product IDs)
  // You can later swap to affiliate-deep links programmatically.
  const highStreet = [
    {
      name: "Strong-shoulder satin top (black)",
      retailer: "Zara",
      priceHint: "€ | search",
      href: "https://www.zara.com/search?searchTerm=strong%20shoulder%20top",
    },
    {
      name: "Bias satin midi skirt",
      retailer: "H&M",
      priceHint: "€ | category",
      href: "https://www2.hm.com/en_eur/ladies/shop-by-product/skirts.html?sort=stock&product-type=ladies_skirt_satin",
    },
    {
      name: "Strappy stiletto sandals",
      retailer: "Mango",
      priceHint: "€ | search",
      href: "https://shop.mango.com/gb/women/search?q=strappy%20sandal",
    },
  ];

  const mid = [
    {
      name: "Architectural-shoulder blazer",
      retailer: "& Other Stories",
      priceHint: "€€ | category",
      href: "https://www.stories.com/en_eur/clothing/blazers.html",
    },
    {
      name: "Liquid satin column dress",
      retailer: "Reformation",
      priceHint: "€€ | evening",
      href: "https://www.thereformation.com/categories/dresses?srule=PriceLowToHigh&prefn1=occasion&prefv1=occasion_evening",
    },
    {
      name: "Sculptural gold cuff",
      retailer: "Mejuri",
      priceHint: "€€ | bracelets",
      href: "https://mejuri.com/shop/collections/bracelets",
    },
  ];

  const luxury = [
    {
      name: "Sculpted-shoulder wool blazer",
      retailer: "NET-A-PORTER",
      priceHint: "€€€ | search",
      href: "https://www.net-a-porter.com/en-nl/shop/search?searchTerm=shoulder%20blazer%20women",
    },
    {
      name: "Metallic/lamé evening gown",
      retailer: "MATCHES",
      priceHint: "€€€ | evening",
      href: "https://www.matchesfashion.com/womens/clothing/evening-dresses",
    },
    {
      name: "Mirror-shine heeled sandal",
      retailer: "Mytheresa",
      priceHint: "€€€ | sandals",
      href: "https://www.mytheresa.com/en-nl/shoes/women/sandals.html?prefn1=heel_type&prefv1=stiletto",
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* JSON-LD Article + Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine (Wearable Formula)",
            description:
              "A story-driven breakdown of Zendaya’s red-carpet signature — and how to translate it into real outfits.",
            author: { "@type": "Person", name: "RunwayTwin Editors" },
            publisher: { "@type": "Organization", name: "RunwayTwin" },
            mainEntityOfPage:
              "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
            image: [heroImg],
            datePublished: "2025-01-01",
            dateModified: "2025-01-01",
          }),
        }}
      />
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
                name: "Zendaya Evening Glam",
                item: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
              },
            ],
          }),
        }}
      />

      <Header />

      {/* HERO */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-3xl px-5 pt-12 pb-4">
          <p className="text-[12px] uppercase tracking-wider text-neutral-500">
            Celebrity Formula
          </p>
          <h1 className="mt-1 font-serif text-4xl leading-[1.08] tracking-tight">
            Zendaya Evening Glam: Sculpted Shoulders, Liquid Shine
          </h1>
          <p className="mt-3 text-sm text-neutral-600">6 min read • Updated 2025</p>
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-8">
          <Figure
            src={heroImg}
            alt="Sleek black evening look with sculpted shoulders and liquid shine"
            caption="Column line + structured shoulders + a single plane of shine — the Zendaya trifecta."
          />
        </div>
      </section>

      {/* BODY */}
      <article className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-5 pb-16 md:grid-cols-12">
        {/* TOC */}
        <aside className="md:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">In this guide</div>
            <nav className="mt-3 text-sm">
              <ol className="space-y-2 text-neutral-700">
                <li><a href="#story" className="hover:underline">The Story</a></li>
                <li><a href="#formula" className="hover:underline">The Formula</a></li>
                <li><a href="#shop" className="hover:underline">Shop by Budget</a></li>
                <li><a href="#fit" className="hover:underline">Fit & Body Type</a></li>
                <li><a href="#finish" className="hover:underline">Finishing Touches</a></li>
              </ol>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="md:col-span-8">
          <Prose>
            <section id="story">
              <h2>Why this look works (the story)</h2>
              <p>
                Zendaya’s evening glamour reads modern because it resists excess.
                Red carpet moments lean on <strong>architectural shoulders</strong>,
                <strong> uninterrupted column lines</strong> and a controlled hit of{" "}
                <strong>liquid shine</strong>. The silhouette does the talking; the
                texture does the whispering. That restraint is why the look adapts so
                well to real life — you can recreate the message without needing couture.
              </p>
              <PullQuote>
                Modern glam is confidence in clean geometry — one great line, one quiet
                shimmer, zero fuss.
              </PullQuote>
            </section>

            <section id="formula">
              <h2>The formula (wearable version)</h2>
              <ul>
                <li>
                  <strong>Top/Outer:</strong> structure at the shoulder (light padding or
                  sharp blazer).
                </li>
                <li>
                  <strong>Body:</strong> a column (bias skirt or straight dress) to keep
                  the line long.
                </li>
                <li>
                  <strong>Surface:</strong> one plane of shine — satin, lamé, patent, or
                  polished metal.
                </li>
                <li>
                  <strong>Shoe:</strong> pointed and sleek to anchor the geometry.
                </li>
              </ul>
              <Figure
                src={detailImg}
                alt="Close-up of satin column dress with structured shoulder"
                caption="Shine on one plane keeps it luxe, not loud."
              />
            </section>

            <section id="shop">
              <h2>Shop the look — real links, three budgets</h2>
              <Note>
                We use stable search/category URLs so items don’t break. When your
                affiliate accounts are live, replace these with your deep links.
              </Note>

              <h3 className="mt-6">High-street</h3>
              <ProductRow
                title="Affordable, clean, effective"
                items={highStreet}
              />

              <h3 className="mt-6">Mid</h3>
              <ProductRow title="Elevated fabric & finish" items={mid} />

              <h3 className="mt-6">Luxury</h3>
              <ProductRow title="Designer structure & textiles" items={luxury} />
            </section>

            <section id="fit">
              <h2>Fit & body type (keep the magic, tweak the cut)</h2>
              <ul>
                <li>
                  <strong>Pear:</strong> add shoulder structure; bias midi or straight
                  column; pointed heel elongates.
                </li>
                <li>
                  <strong>Hourglass:</strong> define the waist (wrap or corset seam); keep
                  skirt column clean.
                </li>
                <li>
                  <strong>Apple:</strong> soften midsection with longline blazer left
                  open; choose V or scoop neckline.
                </li>
                <li>
                  <strong>Rectangle:</strong> shaped shoulder + peplum/seaming for curve;
                  avoid overly boxy lengths.
                </li>
              </ul>
            </section>

            <section id="finish">
              <h2>Finishing touches (the difference between nice and “wow”)</h2>
              <ul>
                <li>One sculptural metal — ear cuff <em>or</em> bracelet (not both).</li>
                <li>Compact structured bag: satin, metallic, or patent.</li>
                <li>Makeup: luminous skin, defined eye, neutral lip.</li>
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
                  href="/stylist"
                >
                  Try this look with live links
                </Link>
                <Link
                  className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                  href="/pricing"
                >
                  Go Premium (€19/mo)
                </Link>
              </div>
            </section>
          </Prose>
        </div>
      </article>

      {/* Related */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-3 text-sm font-semibold">You might also like</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href="/blog/rihanna-street-luxe"
              className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div className="text-sm font-semibold">Rihanna Street Luxe</div>
              <p className="mt-1 text-xs text-neutral-600">5 min read</p>
            </Link>
            <Link
              href="/blog/jennifer-lawrence-work-minimalism"
              className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div className="text-sm font-semibold">J-Law Work Minimalism</div>
              <p className="mt-1 text-xs text-neutral-600">5 min read</p>
            </Link>
            <Link
              href="/blog/finding-your-neutral-palette"
              className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div className="text-sm font-semibold">Find Your Neutrals</div>
              <p className="mt-1 text-xs text-neutral-600">5 min read</p>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

