import type { Metadata } from "next";
import Link from "next/link";
import { getPieceTypes } from "@/lib/drops";
import { breadcrumbLd, ORG_REF, BASE } from "@/lib/seo";

export const revalidate = 3600;

const url = `${BASE}/pieces`;
const title = "Shop Celebrity Outfits by Piece";
const description = "Celebrity coats, dresses, shoes and bags from recent red carpets and street style, each with a close match at high-street, mid-range and luxury prices.";

export const metadata: Metadata = {
  title: { absolute: `${title} | RunwayTwin` },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description },
};

export default async function PiecesIndex() {
  const types = await getPieceTypes();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url,
      publisher: ORG_REF,
      mainEntity: { "@type": "ItemList", itemListElement: types.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${url}/${t.slug}`, name: `Celebrity ${t.label.toLowerCase()}` })) },
    },
    breadcrumbLd([
      { name: "Home", url: BASE },
      { name: "Shop by piece", url },
    ]),
  ];
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span> <span>Shop by piece</span>
      </nav>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Drop Radar</p>
      <h1 className="max-w-3xl font-serif text-[38px] leading-[1.05] tracking-tight md:text-[56px]">Shop celebrity outfits by piece</h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-7 text-neutral-700">
        Want the coat, not the whole look? Every piece from the celebrity looks we break down, sorted by type. Newest first.
      </p>
      {types.length === 0 ? (
        <p className="mt-10 text-neutral-600">Pieces appear here as Drop Radar publishes looks.</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => {
            const who = [...new Set(t.rows.map((r) => r.drop.celebrity))];
            return (
              <li key={t.slug}>
                <Link href={`/pieces/${t.slug}`} className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <span className="font-serif text-2xl">Celebrity {t.label.toLowerCase()}</span>
                  <span className="mt-1 text-[13px] text-neutral-500">{t.rows.length} pieces</span>
                  <span className="mt-3 text-sm leading-6 text-neutral-700">{who.slice(0, 4).join(", ")}{who.length > 4 ? " and more" : ""}</span>
                  <span className="mt-auto pt-5 text-sm font-semibold text-[hsl(27_65%_42%)]">See them all →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-10 text-sm text-neutral-700">
        Or browse by person: <Link href="/style" className="underline underline-offset-4">celebrity outfits A–Z</Link> · <Link href="/looks" className="underline underline-offset-4">this week&apos;s looks</Link>
      </p>
    </div>
  );
}
