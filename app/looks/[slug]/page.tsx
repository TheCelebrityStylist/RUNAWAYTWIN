import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrop, getDrops, getEvents, appLookHref, tierShopHref, euro, fmtDate, slugOfCeleb, type Drop, type DropItem } from "@/lib/drops";
import { getCeleb } from "@/lib/celebs";

const BASE = "https://runwaytwin.com";
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const drops = await getDrops(100);
  return drops.map((d) => ({ slug: d.slug }));
}

const credited = (d: Drop) => d.items.filter((i) => i.brand && i.brand_confidence === "high");
const titleOf = (d: Drop) => `${d.celebrity} at ${d.event}: every piece & where to buy it`;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await getDrop(params.slug);
  if (!d) return { title: "Look not found", robots: { index: false } };
  const url = `${BASE}/looks/${d.slug}`;
  const brands = credited(d).map((i) => i.brand).filter((b, i, a) => a.indexOf(b) === i).slice(0, 3);
  const description = `What ${d.celebrity} wore at ${d.event}${brands.length ? ` (${brands.join(", ")})` : ""}: all ${d.items.length} pieces identified${d.twin ? `, and how to get ${d.twin.score}% of the look for ${euro(d.twin.cost)}` : ""}.`;
  return {
    title: { absolute: `${titleOf(d)} | RunwayTwin` },
    description,
    alternates: { canonical: url },
    openGraph: { title: titleOf(d), description, url, type: "article", publishedTime: d.published_at, images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: titleOf(d), description },
  };
}

function Piece({ it }: { it: DropItem }) {
  const exact = it.brand && it.brand_confidence === "high";
  const tiers = [
    { k: "high_street" as const, label: "High street" },
    { k: "mid" as const, label: "Mid-range" },
    { k: "luxury" as const, label: exact ? "The original" : "Luxury" },
  ];
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-6 w-6 flex-shrink-0 rounded-md border border-neutral-200" style={{ backgroundColor: it.color_hex || "#F0EBE3" }} aria-hidden />
        <div>
          <h3 className="text-[16px] font-semibold first-letter:uppercase">{it.name}</h3>
          {exact ? (
            <p className="mt-0.5 text-[13px] text-neutral-700">By <b>{it.brand}</b> (credited in press coverage)</p>
          ) : it.brand ? (
            <p className="mt-0.5 text-[13px] text-neutral-700">Looks like {it.brand}</p>
          ) : null}
          {it.details && <p className="mt-1 text-[14px] leading-6 text-neutral-700">{it.details}</p>}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {tiers.map(({ k, label }) =>
          it[k]?.price_eur ? (
            <a key={k} href={tierShopHref(it, k)} rel="sponsored nofollow noopener" target="_blank" className="rounded-xl border border-neutral-200 bg-[#FAF9F6] px-3 py-2 hover:border-neutral-400">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</span>
              <span className="block text-[14px] font-semibold">{euro(it[k]!.price_eur)}</span>
              <span className="block truncate text-[11px] text-neutral-600">like {it[k]!.brand}{it[k]!.match ? ` · ${it[k]!.match}%` : ""}</span>
            </a>
          ) : null,
        )}
      </div>
    </li>
  );
}

export default async function LookPage({ params }: { params: { slug: string } }) {
  const d = await getDrop(params.slug);
  if (!d) notFound();
  const url = `${BASE}/looks/${d.slug}`;
  const hub = getCeleb(slugOfCeleb(d.celebrity));
  const brands = credited(d).map((i) => `${i.brand} (${i.name})`);
  const others = (await getDrops(40)).filter((x) => x.slug !== d.slug).slice(0, 6);
  const lowTotal = d.totals?.high_street || 0;
  const ev = (await getEvents()).find((e) => e.looks.some((x) => x.slug === d.slug));

  const faq = [
    {
      q: `What did ${d.celebrity} wear at ${d.event}?`,
      a: `${d.summary ? d.summary + " " : ""}The outfit has ${d.items.length} pieces: ${d.items.map((i) => i.name).join(", ")}.`,
    },
    {
      q: `Who designed ${d.celebrity}'s outfit?`,
      a: brands.length
        ? `Credited in press coverage: ${brands.join("; ")}. The other pieces were not credited; RunwayTwin lists the closest matches.`
        : `No designers were credited in the coverage we found. RunwayTwin lists the closest matches at three price levels.`,
    },
    ...(d.twin
      ? [{
          q: `How much does ${d.celebrity}'s look cost, and is there a cheaper version?`,
          a: `The originals come to roughly ${euro(d.twin.originals)}. Our best-value version gets ${d.twin.score}% of the look for about ${euro(d.twin.cost)}${lowTotal ? `, and the all-high-street version costs about ${euro(lowTotal)}` : ""}. Twin Score is an AI estimate of how close the pieces get to the original.`,
        }]
      : []),
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: titleOf(d),
      description: d.summary || d.vibe,
      datePublished: d.published_at,
      dateModified: d.published_at,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "RunwayTwin", url: BASE },
      publisher: { "@type": "Organization", name: "RunwayTwin", url: BASE },
      about: [{ "@type": "Person", name: d.celebrity }, { "@type": "Event", name: d.event, startDate: d.look_date }],
      citation: (d.sources || []).map((s) => ({ "@type": "CreativeWork", name: s.name, url: s.url })),
      mentions: credited(d).map((i) => ({ "@type": "Brand", name: i.brand })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Celebrity looks", item: `${BASE}/looks` },
        { "@type": "ListItem", position: 3, name: `${d.celebrity}, ${d.event}`, item: url },
      ],
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mx-auto max-w-3xl px-5 pt-12 pb-6">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span>{" "}
          <Link href="/looks" className="hover:underline">Celebrity looks</Link> <span aria-hidden>›</span> <span>{d.celebrity}</span>
        </nav>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Drop Radar · {fmtDate(d.look_date)}</p>
        <h1 className="font-serif text-[34px] leading-[1.08] tracking-tight md:text-[48px]">What {d.celebrity} wore at {d.event}</h1>
        {d.summary && <p className="mt-5 text-[17px] leading-8 text-neutral-800">{d.summary}</p>}
        {d.vibe && <p className="mt-3 text-[15px] leading-7 text-neutral-600">{d.vibe}</p>}
        {d.palette?.length ? (
          <div className="mt-5 flex gap-1.5" aria-label="Colour palette">{d.palette.map((h) => <span key={h} title={h} className="h-6 w-6 rounded-full ring-1 ring-neutral-200" style={{ backgroundColor: h }} />)}</div>
        ) : null}
      </header>

      {d.twin && (
        <section className="mx-auto max-w-3xl px-5">
          <div className="rounded-3xl bg-[#1A1A1A] p-6 text-white md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A96E]">Twin Score</p>
            <p className="mt-2 font-serif text-[44px] leading-none md:text-[56px]">{d.twin.score}% of the look for {euro(d.twin.cost)}</p>
            <p className="mt-3 text-[14px] text-neutral-300">The originals: ~{euro(d.twin.originals)}. RunwayTwin spends where it shows and saves where it doesn&apos;t. Drag the dial to your own budget, or see how much of it you already own.</p>
            <a href={appLookHref(d.slug)} className="mt-5 inline-flex rounded-full bg-[#C9A96E] px-6 py-3 text-sm font-semibold text-[#1A1A1A] hover:opacity-90">Get this look at your budget</a>
          </div>
        </section>
      )}

      <article className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="font-serif text-2xl tracking-tight md:text-3xl">Every piece, at three prices</h2>
        <ul className="mt-5 space-y-3">{d.items.map((it, i) => <Piece key={i} it={it} />)}</ul>

        {d.styling_tips?.length ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl tracking-tight md:text-3xl">How to wear it</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-neutral-700">{d.styling_tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">Questions</h2>
          <div className="mt-4 space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h3 className="text-[15px] font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {d.sources?.length ? (
          <section className="mt-10 text-sm text-neutral-600">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.15em] text-neutral-500">Reported by</h2>
            <ul className="mt-2 space-y-1">{d.sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener" target="_blank" className="underline underline-offset-2">{s.name}</a></li>)}</ul>
            <p className="mt-3 text-xs text-neutral-500">Pieces are identified by AI from published coverage. Credited designers are marked; everything else is a close match. Prices are estimates.</p>
          </section>
        ) : null}

        <nav className="mt-12 border-t border-neutral-200 pt-6 text-sm" aria-label="More looks">
          {ev && <p className="mb-4"><Link href={`/events/${ev.slug}`} className="font-semibold underline underline-offset-4">Everyone at {ev.name} {ev.year} →</Link></p>}
          {hub && <p className="mb-4"><Link href={`/style/${hub.slug}`} className="font-semibold underline underline-offset-4">{hub.name}&apos;s style formula →</Link></p>}
          {others.length > 0 && (
            <>
              <p className="font-semibold">More celebrity looks this week</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {others.map((o) => <li key={o.slug}><Link href={`/looks/${o.slug}`} className="underline underline-offset-4">{o.celebrity} at {o.event}</Link></li>)}
              </ul>
            </>
          )}
        </nav>
      </article>
    </div>
  );
}
