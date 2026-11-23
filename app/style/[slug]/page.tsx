import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CELEBS, getCeleb, shopHref } from "@/lib/celebs";
import { getDrops, getCelebHub, getCelebHubs, HUB_MIN_LOOKS, slugOfCeleb, euro, fmtDate } from "@/lib/drops";
import { getArticle } from "@/lib/journal";
import { fitTitle, clip, ORG_REF } from "@/lib/seo";
import DataHub, { dataHubMeta } from "./DataHub";

export const revalidate = 3600;

const BASE = "https://runwaytwin.com";

/* Two kinds of celebrity page share /style/[slug]:
   - editorial style formulas (lib/celebs.ts)
   - data hubs built from Drop Radar looks, for anyone with at least HUB_MIN_LOOKS looks. */
export const dynamicParams = true;
export async function generateStaticParams() {
  const hubs = (await getCelebHubs()).filter((h) => h.looks.length >= HUB_MIN_LOOKS && !getCeleb(h.slug));
  return [...CELEBS.map((c) => ({ slug: c.slug })), ...hubs.map((h) => ({ slug: h.slug }))];
}

async function dataHubFor(slug: string) {
  if (getCeleb(slug)) return null;
  const h = await getCelebHub(slug);
  return h && h.looks.length >= HUB_MIN_LOOKS ? h : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = getCeleb(params.slug);
  if (!c) {
    const h = await dataHubFor(params.slug);
    return h ? dataHubMeta(h) : { title: "Not found", robots: { index: false } };
  }
  const url = `${BASE}/style/${c.slug}`;
  const title = `${c.name} Outfits: Her Style Formula & Where to Buy It`;
  const description = clip(c.description);
  return {
    title: { absolute: fitTitle([title, `${c.name} Outfits: Style Formula & Where to Buy`, `${c.name} Outfits & Style Formula`]) },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CelebPage({ params }: { params: { slug: string } }) {
  const c = getCeleb(params.slug);
  if (!c) {
    const h = await dataHubFor(params.slug);
    if (!h) notFound();
    return <DataHub hub={h} />;
  }
  const last = c.name.toLowerCase().split(" ").slice(-1)[0];
  const latest = (await getDrops(500))
    .filter((d) => slugOfCeleb(d.celebrity) === c.slug || (d.celebrity.toLowerCase().includes(last) && d.celebrity.toLowerCase().startsWith(c.short.toLowerCase())))
    .slice(0, 6);
  const reads = ["celebrity-style-archetypes-guide", "celebrity-capsule-wardrobe-12-pieces"].map(getArticle).filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];
  const url = `${BASE}/style/${c.slug}`;
  const related = c.related.map(getCeleb).filter(Boolean) as NonNullable<ReturnType<typeof getCeleb>>[];
  const shop = shopHref(c.name);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${c.name} Outfits: Her Style Formula & Where to Buy It`,
      description: c.description,
      mainEntityOfPage: url,
      author: ORG_REF,
      publisher: ORG_REF,
      about: { "@type": "Person", name: c.name },
      dateModified: "2026-11-01",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Celebrity style", item: `${BASE}/style` },
        { "@type": "ListItem", position: 3, name: c.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mx-auto max-w-3xl px-5 pt-14 pb-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span>{" "}
          <Link href="/style" className="hover:underline">Celebrity style</Link> <span aria-hidden>›</span> <span>{c.name}</span>
        </nav>
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Celebrity style</p>
        <h1 className="font-serif text-[38px] leading-[1.05] tracking-tight md:text-[52px]">{c.name} outfits</h1>
        <p className="mt-4 font-serif text-xl italic text-neutral-700">{c.tagline}</p>
        {c.intro.map((p, i) => (
          <p key={i} className="mt-5 text-[16px] leading-7 text-neutral-700">{p}</p>
        ))}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={shop} className="inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90">
            Shop {c.short}&apos;s looks
          </Link>
          <Link href="/celebrity-outfit-finder" className="inline-flex rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold hover:bg-neutral-50">
            ID one of her outfits from a photo
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-14">
        {latest.length > 0 && (
          <section className="mt-6 rounded-3xl bg-[#1A1A1A] p-7 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A96E]">Latest looks</p>
            <ul className="mt-4 space-y-3">
              {latest.map((d) => (
                <li key={d.slug}>
                  <Link href={`/looks/${d.slug}`} className="group block">
                    <span className="text-[12px] text-neutral-400">{fmtDate(d.look_date)}</span>
                    <span className="block font-serif text-xl group-hover:underline">{d.event}</span>
                    {d.twin && <span className="text-[13px] text-neutral-300">{d.twin.score}% of the look for {euro(d.twin.cost)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-7">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">The {c.short} formula</h2>
          <ol className="mt-5 space-y-3">
            {c.formula.map((f, i) => (
              <li key={f} className="flex gap-3 text-[15px] leading-7 text-neutral-800">
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3EFE7] text-xs font-semibold">{i + 1}</span>
                {f}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">The pieces to buy</h2>
          <p className="mt-3 text-[15px] leading-7 text-neutral-700">What to look for in each one, so the version you buy actually looks like hers.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {c.pieces.map((p) => (
              <div key={p.name} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5">
                <h3 className="text-base font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{p.look}</p>
                <Link href={shop} className="mt-auto pt-4 text-sm font-semibold text-[hsl(27_65%_42%)] underline underline-offset-4">
                  Find it at your price
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">Dressing like {c.short} at every budget</h2>
          <dl className="mt-6 space-y-5">
            {[
              ["High street", c.budget.high],
              ["Mid-range", c.budget.mid],
              ["The originals", c.budget.lux],
            ].map(([k, v]) => (
              <div key={k} className="border-l-2 border-[hsl(27_65%_42%)] pl-4">
                <dt className="text-sm font-semibold">{k}</dt>
                <dd className="mt-1 text-[15px] leading-7 text-neutral-700">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {c.guide && (
          <aside className="mt-12 rounded-2xl border border-neutral-200 bg-[#FAF9F6] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">In-depth guide</p>
            <Link href={c.guide.href} className="mt-2 block font-serif text-xl hover:underline">{c.guide.label}</Link>
          </aside>
        )}

        {reads.length > 0 && (
          <aside className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">From the Journal</p>
            <ul className="mt-2 space-y-2">
              {reads.map((a) => <li key={a.slug}><Link href={`/blog/${a.slug}`} className="font-serif text-lg hover:underline">{a.title}</Link></li>)}
            </ul>
          </aside>
        )}

        <section className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">Questions about {c.short}&apos;s style</h2>
          <div className="mt-5 space-y-3">
            {c.faq.map((f) => (
              <details key={f.q} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold">{f.q}</summary>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12 rounded-3xl bg-black p-8 text-white">
          <p className="font-serif text-2xl">Saw {c.short} in something you want?</p>
          <p className="mt-2 text-sm text-neutral-300">Upload the photo. Every piece, three price levels, ten seconds.</p>
          <Link href={shop} className="mt-5 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:opacity-90">
            Shop {c.short}&apos;s looks
          </Link>
        </div>

        <nav aria-label="Related celebrities" className="mt-12 border-t border-neutral-200 pt-6">
          <p className="text-sm font-semibold">If you like {c.short}&apos;s style</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/style/${r.slug}`} className="block rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50">
                  <span className="block text-sm font-semibold">{r.name} outfits</span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-600">{r.tagline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </div>
  );
}
