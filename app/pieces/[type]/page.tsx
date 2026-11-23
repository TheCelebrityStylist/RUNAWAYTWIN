import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPieceType, getPieceTypes, shoppable, productHref, tierShopHref, euro, fmtDate } from "@/lib/drops";
import { getArticle } from "@/lib/journal";
import { fitTitle, clip, breadcrumbLd, productLd, ORG_REF, BASE } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPieceTypes()).map((t) => ({ type: t.slug }));
}

export async function generateMetadata({ params }: { params: { type: string } }): Promise<Metadata> {
  const t = await getPieceType(params.type);
  if (!t) return { title: "Not found", robots: { index: false } };
  const url = `${BASE}/pieces/${t.slug}`;
  const title = `Celebrity ${t.label}: Get the Look for Less`;
  const names = [...new Set(t.rows.map((r) => r.drop.celebrity))].slice(0, 3).join(", ");
  const description = clip(`The ${t.plural} celebrities wore recently, from ${names} and more. Credited designers, plus close matches at high-street, mid-range and luxury prices.`);
  return {
    title: { absolute: fitTitle([title, `Celebrity ${t.label}: Get the Look`, `Celebrity ${t.label}`]) },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PieceTypePage({ params }: { params: { type: string } }) {
  const t = await getPieceType(params.type);
  if (!t) notFound();
  const all = await getPieceTypes();
  const url = `${BASE}/pieces/${t.slug}`;
  const rows = t.rows.slice(0, 60);
  const credited = rows.filter((r) => r.item.brand && r.item.brand_confidence === "high");
  const designers = [...new Set(credited.map((r) => r.item.brand as string))];
  const offers = rows.flatMap((r) => shoppable(r.drop.products?.[String(r.index)]).slice(0, 2));
  const reads = ["how-to-judge-a-dupe-twin-score", "dupe-look-cheap-7-tells"].map(getArticle).filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Celebrity ${t.label.toLowerCase()}`,
      url,
      dateModified: rows[0]?.drop.published_at,
      publisher: ORG_REF,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/looks/${r.drop.slug}`, name: `${r.drop.celebrity}: ${r.item.name}` })),
      },
    },
    breadcrumbLd([
      { name: "Home", url: BASE },
      { name: "Shop by piece", url: `${BASE}/pieces` },
      { name: t.label, url },
    ]),
    ...(offers.length
      ? [{ "@context": "https://schema.org", "@type": "ItemList", name: `Shop celebrity ${t.plural}`, itemListElement: offers.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: i + 1, item: productLd(p) })) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span>{" "}
        <Link href="/pieces" className="hover:underline">Shop by piece</Link> <span aria-hidden>›</span> <span>{t.label}</span>
      </nav>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Drop Radar · {t.rows.length} pieces</p>
      <h1 className="font-serif text-[36px] leading-[1.06] tracking-tight md:text-[52px]">Celebrity {t.label.toLowerCase()}, and how to get them for less</h1>
      <p className="mt-5 text-[16px] leading-7 text-neutral-700">
        The {t.plural} from every celebrity look RunwayTwin has broken down, newest first. Each one has a close match at three prices.
        {designers.length ? ` Credited designers here include ${designers.slice(0, 8).join(", ")}.` : ""}
      </p>

      <ol className="mt-10 space-y-4">
        {rows.map((r) => {
          const exact = r.item.brand && r.item.brand_confidence === "high";
          const shop = shoppable(r.drop.products?.[String(r.index)]).slice(0, 3);
          return (
            <li key={`${r.drop.slug}-${r.index}`} className="rounded-3xl border border-neutral-200 bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{r.drop.celebrity} · {fmtDate(r.drop.look_date)}</p>
              <h2 className="mt-1 font-serif text-2xl leading-tight first-letter:uppercase">
                <Link href={`/looks/${r.drop.slug}`} className="hover:underline">{r.item.name}</Link>
              </h2>
              <p className="mt-1 text-[13px] text-neutral-600">
                Worn at {r.drop.event}{exact ? <> · by <b>{r.item.brand}</b> (credited in press coverage)</> : null}
              </p>
              {r.item.details && <p className="mt-2 text-[15px] leading-7 text-neutral-700">{r.item.details}</p>}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["high_street", "mid", "luxury"] as const).map((k) =>
                  r.item[k]?.price_eur ? (
                    <a key={k} href={tierShopHref(r.item, k)} rel="sponsored nofollow noopener" target="_blank" className="rounded-xl border border-neutral-200 bg-[#FAF9F6] px-3 py-2 hover:border-neutral-400">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{k === "high_street" ? "High street" : k === "mid" ? "Mid-range" : exact ? "The original" : "Luxury"}</span>
                      <span className="block text-[14px] font-semibold">~{euro(r.item[k]!.price_eur)}</span>
                      <span className="block truncate text-[11px] text-neutral-600">like {r.item[k]!.brand}</span>
                    </a>
                  ) : null,
                )}
              </div>
              {shop.length > 0 && (
                <ul className="mt-3 space-y-1 text-[13px]">
                  {shop.map((p) => (
                    <li key={p.url}>
                      <a href={productHref(p)} rel="sponsored nofollow noopener" target="_blank" className="underline underline-offset-2">{p.brand || p.shop}: {p.title}</a> · {euro(p.price_eur)} at {p.shop}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-neutral-500">Pieces are identified by AI from published coverage. Tier prices marked ~ are estimates; shop prices were checked when the look was published and can change.</p>

      <nav aria-label="Related" className="mt-12 border-t border-neutral-200 pt-6 text-sm">
        <p className="font-semibold">Other pieces</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {all.filter((o) => o.slug !== t.slug).map((o) => (
            <li key={o.slug}><Link href={`/pieces/${o.slug}`} className="inline-flex rounded-full border border-neutral-300 bg-white px-4 py-2 hover:bg-neutral-50">Celebrity {o.label.toLowerCase()}</Link></li>
          ))}
        </ul>
        <ul className="mt-6 space-y-1">
          {reads.map((a) => <li key={a.slug}><Link href={`/blog/${a.slug}`} className="underline underline-offset-4">{a.title}</Link></li>)}
          <li><Link href="/style" className="underline underline-offset-4">All celebrity outfits</Link></li>
        </ul>
      </nav>
    </div>
  );
}
