import type { Metadata } from "next";
import Link from "next/link";
import { euro, fmtDate, pieceTypeOf, type CelebHub } from "@/lib/drops";
import { getArticle } from "@/lib/journal";
import { fitTitle, clip, breadcrumbLd, ORG_REF, BASE } from "@/lib/seo";

/* Celebrity hub built only from Drop Radar data: no editorial claims, just what was worn and what it costs to recreate. */

const designersOf = (h: CelebHub) => {
  const seen = new Map<string, number>();
  for (const d of h.looks) for (const i of d.items) if (i.brand && i.brand_confidence === "high") seen.set(i.brand, (seen.get(i.brand) || 0) + 1);
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([b]) => b);
};
const evShort = (e: string) => e.split(",")[0].trim();

export function dataHubMeta(h: CelebHub): Metadata {
  const url = `${BASE}/style/${h.slug}`;
  const title = `${h.name} Outfits: Every Look & Where to Buy It`;
  const events = h.looks.slice(0, 3).map((d) => evShort(d.event)).join(", ");
  const description = clip(`${h.name}'s outfits, piece by piece: ${events}. Credited designers, close matches at high-street, mid-range and luxury prices.`);
  return {
    title: { absolute: fitTitle([title, `${h.name} Outfits: Every Look, Every Piece`, `${h.name} Outfits & Where to Buy Them`, `${h.name} Outfits`]) },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", images: [{ url: `/looks/${h.latest.slug}/opengraph-image`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function DataHub({ hub: h }: { hub: CelebHub }) {
  const url = `${BASE}/style/${h.slug}`;
  const designers = designersOf(h);
  const scored = h.looks.filter((d) => d.twin && d.twin.cost > 0);
  const best = [...scored].sort((a, b) => b.twin!.score / b.twin!.cost - a.twin!.score / a.twin!.cost)[0];
  const first = h.looks[h.looks.length - 1];
  const types = [...new Map(h.looks.flatMap((d) => d.items.map((i) => pieceTypeOf(i.category))).filter(Boolean).map((t) => [t!.slug, t!])).values()];
  const reads = ["celebrity-style-archetypes-guide", "how-to-judge-a-dupe-twin-score"].map(getArticle).filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];

  const faq = [
    {
      q: `What has ${h.name} worn recently?`,
      a: h.looks.slice(0, 5).map((d) => `${d.event} (${fmtDate(d.look_date)}): ${d.items.map((i) => i.name).join(", ")}`).join(". ") + ".",
    },
    {
      q: `Which designers has ${h.name} worn?`,
      a: designers.length
        ? `Credited in press coverage of the looks on this page: ${designers.slice(0, 8).join(", ")}. Uncredited pieces are listed as close matches.`
        : `None of the looks on this page had a designer credited in the coverage we found. Each piece is listed with close matches instead.`,
    },
    ...(best
      ? [{
          q: `Which ${h.name} look is cheapest to recreate?`,
          a: `By Twin Score per euro, ${best.event}: ${best.twin!.score}% of the look for about ${euro(best.twin!.cost)}, against roughly ${euro(best.twin!.originals)} for the originals. Twin Score is an AI estimate of how close the cheaper pieces get.`,
        }]
      : []),
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${h.name} outfits`,
      url,
      dateModified: h.latest.published_at,
      about: { "@type": "Person", name: h.name },
      publisher: ORG_REF,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: h.looks.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/looks/${d.slug}`, name: `${h.name} at ${d.event}` })),
      },
    },
    breadcrumbLd([
      { name: "Home", url: BASE },
      { name: "Celebrity style", url: `${BASE}/style` },
      { name: h.name, url },
    ]),
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mx-auto max-w-3xl px-5 pt-14 pb-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span>{" "}
          <Link href="/style" className="hover:underline">Celebrity style</Link> <span aria-hidden>›</span> <span>{h.name}</span>
        </nav>
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Drop Radar · {h.looks.length} looks</p>
        <h1 className="font-serif text-[38px] leading-[1.05] tracking-tight md:text-[52px]">{h.name} outfits</h1>
        <p className="mt-5 text-[16px] leading-7 text-neutral-700">
          Every {h.name} look RunwayTwin has broken down since {fmtDate(first.look_date)}. Each piece is identified, credited designers are named, and every piece has a close match at high-street, mid-range and luxury prices.
        </p>
        {designers.length > 0 && (
          <p className="mt-4 text-[15px] leading-7 text-neutral-700">
            <b>Designers credited:</b> {designers.slice(0, 10).join(", ")}.
          </p>
        )}
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-14">
        <ol className="space-y-4">
          {h.looks.map((d) => (
            <li key={d.slug} className="rounded-3xl border border-neutral-200 bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{fmtDate(d.look_date)}</p>
              <h2 className="mt-1 font-serif text-2xl leading-tight"><Link href={`/looks/${d.slug}`} className="hover:underline">{d.event}</Link></h2>
              {d.summary && <p className="mt-2 text-[15px] leading-7 text-neutral-700">{d.summary}</p>}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {d.items.map((i, k) => (
                  <li key={k} className="rounded-full bg-[#F3EFE7] px-3 py-1 text-[12px]">
                    {i.name}{i.brand && i.brand_confidence === "high" ? ` · ${i.brand}` : ""}
                  </li>
                ))}
              </ul>
              {d.twin && <p className="mt-3 text-[13px]"><b>{d.twin.score}%</b> of the look for <b>{euro(d.twin.cost)}</b> · originals ~{euro(d.twin.originals)}</p>}
              <Link href={`/looks/${d.slug}`} className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-[13px] font-semibold text-white">Every piece</Link>
            </li>
          ))}
        </ol>

        <section className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">Questions about {h.name}&apos;s outfits</h2>
          <div className="mt-5 space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h3 className="text-[15px] font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-neutral-500">Pieces are identified by AI from published coverage. Prices are estimates.</p>
        </section>

        <nav aria-label="Related" className="mt-12 border-t border-neutral-200 pt-6 text-sm">
          {types.length > 0 && (
            <p className="mb-4 text-neutral-700">
              Celebrity pieces by type:{" "}
              {types.map((t, i) => (
                <span key={t.slug}>{i > 0 ? " · " : ""}<Link href={`/pieces/${t.slug}`} className="underline underline-offset-4">{t.label}</Link></span>
              ))}
            </p>
          )}
          <ul className="space-y-1">
            {reads.map((a) => <li key={a.slug}><Link href={`/blog/${a.slug}`} className="underline underline-offset-4">{a.title}</Link></li>)}
            <li><Link href="/style" className="underline underline-offset-4">All celebrity outfits</Link></li>
          </ul>
        </nav>
      </article>
    </div>
  );
}
