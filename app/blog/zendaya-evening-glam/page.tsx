// app/blog/zendaya-evening-glam/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

/* ============================================================================
   Article — Zendaya Evening Glam (Premium Editorial • SEO Article JSON-LD)
   - Server Component only (no "use client")
   - Sticky header + luxury footer (same system)
   - Table of contents, pull quotes, internal links, product block placeholders
   - Replace image URLs when you add assets
   ============================================================================ */

export const metadata: Metadata = {
  title:
    "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine (Shop the Formula) │ RunwayTwin",
  description:
    "Decode Zendaya’s evening formula: strong shoulders, column silhouettes, liquid shine. Get shoppable picks for high-street, mid, and luxury—EU/US stock.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam" },
  openGraph: {
    title: "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine",
    description:
      "Strong shoulders, column lines, liquid shine—shop the exact vibe at every budget.",
    url: "https://runwaytwin.vercel.app/blog/zendaya-evening-glam",
    type: "article",
    siteName: "RunwayTwin",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine",
    description:
      "Editorial guide with shoppable picks, tuned to your budget and size.",
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
      {/* Replace with your asset */}
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
  items: { name: string; price: string; retailer: string; href: string }[];
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
            <div className="text-xs text-neutral-600">
              {p.retailer} • {p.price}
            </div>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        Disclosure: some links are affiliate links; we may earn a commission at no extra cost to you.
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
          <Link href="/stylist" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">
            Stylist
          </Link>
          <Link href="/about" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">
            About
          </Link>
          <Link href="/blog" aria-current="page" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">
            Blog
          </Link>
          <Link href="/pricing" className="rounded-full px-3 py-2 text-neutral-700 hover:bg-neutral-100">
            Pricing
          </Link>
          <Link
            href="/stylist"
            className="ml-2 inline-flex items-center rounded-full bg-black px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
          >
            Start Styling
          </Link>
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
  // Replace these with your hosted images
  const heroImg =
    "https://images.unsplash.com/photo-1520975922215-cad47f1fd85b?q=80&w=1600&auto=format&fit=crop"; // placeholder
  const detailImg =
    "https://images.unsplash.com/photo-1542060748-10c28b62716a?q=80&w=1600&auto=format&fit=crop"; // placeholder

  // Demo product links — replace with real affiliate URLs
  const highStreet = [
    {
      name: "Strong-Shoulder Satin Top (Black)",
      price: "€49",
      retailer: "Zara",
      href: "https://www.zara.com/",
    },
    {
      name: "Column Skirt (Bias Satin, Black)",
      price: "€39",
      retailer: "H&M",
      href: "https://www2.hm.com/",
    },
    {
      name: "Strappy Heeled Sandal",
      price: "€59",
      retailer: "Mango",
      href: "https://shop.mango.com/",
    },
  ];
  const mid = [
    {
      name: "Architectural-Shoulder Blazer",
      price: "€179",
      retailer: "& Other Stories",
      href: "https://www.stories.com/",
    },
    {
      name: "Liquid-Satin Column Dress",
      price: "€220",
      retailer: "Reformation",
      href: "https://www.reformation.com/",
    },
    {
      name: "Sculptural Cuff Bracelet (Gold-Tone)",
      price: "€95",
      retailer: "Mejuri",
      href: "https://mejuri.com/",
    },
  ];
  const luxury = [
    {
      name: "Sculpted-Shoulder Wool Blazer",
      price: "€1,250",
      retailer: "Net-a-Porter",
      href: "https://www.net-a-porter.com/",
    },
    {
      name: "Liquid-Lamé Gown (Black)",
      price: "€2,100",
      retailer: "Matches",
      href: "https://www.matchesfashion.com/",
    },
    {
      name: "Mirror-Shine Sandal",
      price: "€790",
      retailer: "Mytheresa",
      href: "https://www.mytheresa.com/",
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
              "Zendaya Evening Glam — Sculpted Shoulders & Liquid Shine (Shop the Formula)",
            description:
              "Strong shoulders, column silhouettes and liquid shine—how to translate Zendaya’s red-carpet formula for real life.",
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
          <p className="mt-3 text-sm text-neutral-600">
            6 min read • Updated 2025
          </p>
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-8">
          <Figure
            src={heroImg}
            alt="Sleek black evening look with sculpted shoulders and liquid shine"
            caption="Sculpted shoulders + column lines + liquid shine — the Zendaya evening trifecta."
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
                <li>
                  <a href="#formula" className="hover:underline">
                    The Formula
                  </a>
                </li>
                <li>
                  <a href="#shop" className="hover:underline">
                    Shop the Look (Budgets)
                  </a>
                </li>
                <li>
                  <a href="#fit" className="hover:underline">
                    Fit & Body Type
                  </a>
                </li>
                <li>
                  <a href="#finish" className="hover:underline">
                    Finishing Touches
                  </a>
                </li>
              </ol>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="md:col-span-8">
          <Prose>
            <section id="formula">
              <h2>The Formula</h2>
              <p>
                Zendaya’s evening signature combines{" "}
                <strong>sculpted shoulders</strong>,{" "}
                <strong>column silhouettes</strong> and{" "}
                <strong>liquid shine</strong>. Keep the lines long and
                uninterrupted; anchor everything with sharp footwear.
              </p>
              <Figure
                src={detailImg}
                alt="Close-up of satin column dress with structured shoulder"
                caption="Column line with shoulder structure: the fastest route to ‘expensive’."
              />
              <PullQuote>
                You don’t need sequins everywhere—just one surface of shine in a
                clean silhouette reads modern and luxe.
              </PullQuote>
            </section>

            <section id="shop">
              <h2>Shop the Look by Budget</h2>
              <Note>
                Links below are examples—swap in your region & sizes in the Styl­ist for
                live EU/US availability.
              </Note>

              <h3 className="mt-6">High-street</h3>
              <ProductRow title="Save without losing the silhouette" items={highStreet} />

              <h3 className="mt-6">Mid</h3>
              <ProductRow title="Elevated fabrics and cleaner finish" items={mid} />

              <h3 className="mt-6">Luxury</h3>
              <ProductRow title="Designer structure and liquid textiles" items={luxury} />
            </section>

            <section id="fit">
              <h2>Fit & Body Type</h2>
              <ul>
                <li>
                  <strong>Pear:</strong> add shoulder structure; bias midi or straight
                  column on bottom; pointed shoes for length.
                </li>
                <li>
                  <strong>Hourglass:</strong> define the waist or use a corset bodice to
                  follow the curve; avoid heavy volume at hips.
                </li>
                <li>
                  <strong>Apple:</strong> soften the midsection with a longline blazer or
                  column dress; V-neck elongates.
                </li>
                <li>
                  <strong>Rectangle:</strong> choose a shaped shoulder or peplum/waist
                  detail to introduce curve.
                </li>
              </ul>
            </section>

            <section id="finish">
              <h2>Finishing Touches</h2>
              <ul>
                <li>Jewelry: one sculptural gold piece (ear or cuff), not both.</li>
                <li>Shoes: pointed stiletto or sleek sandal.</li>
                <li>Bag: compact, structured, metallic or satin.</li>
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
              <div className="text-sm font-semibold">
                Rihanna Street Luxe: Oversize & Pointed
              </div>
              <p className="mt-1 text-xs text-neutral-600">5 min read</p>
            </Link>
            <Link
              href="/blog/jennifer-lawrence-work-minimalism"
              className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div className="text-sm font-semibold">
                Jennifer Lawrence Work Minimalism
              </div>
              <p className="mt-1 text-xs text-neutral-600">5 min read</p>
            </Link>
            <Link
              href="/blog/finding-your-neutral-palette"
              className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div className="text-sm font-semibold">
                Find Your Neutral Palette
              </div>
              <p className="mt-1 text-xs text-neutral-600">5 min read</p>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
