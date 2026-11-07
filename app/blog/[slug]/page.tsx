import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle, type Block } from "@/lib/journal";

const BASE = "https://runwaytwin.com";
export const dynamicParams = false;
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug);
  if (!a) return {};
  const url = `${BASE}/blog/${a.slug}`;
  return {
    title: { absolute: `${a.seoTitle} | RunwayTwin` },
    description: a.description,
    alternates: { canonical: url },
    openGraph: { title: a.title, description: a.description, url, type: "article", publishedTime: a.published, modifiedTime: a.updated || a.published, tags: a.tags },
    twitter: { card: "summary_large_image", title: a.title, description: a.description },
  };
}

const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Render({ b }: { b: Block }) {
  switch (b.t) {
    case "p":
      return <p className="mt-5 text-[17px] leading-8 text-neutral-800">{b.text}</p>;
    case "h2":
      return <h2 className="mt-12 font-serif text-[28px] leading-tight tracking-tight md:text-[32px]">{b.text}</h2>;
    case "h3":
      return <h3 className="mt-8 text-lg font-semibold">{b.text}</h3>;
    case "ul":
      return <ul className="mt-5 list-disc space-y-2 pl-6 text-[17px] leading-8 text-neutral-800">{b.items.map((i) => <li key={i}>{i}</li>)}</ul>;
    case "ol":
      return <ol className="mt-5 list-decimal space-y-2 pl-6 text-[17px] leading-8 text-neutral-800">{b.items.map((i) => <li key={i}>{i}</li>)}</ol>;
    case "table":
      return (
        <figure className="mt-6">
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[#F3EFE7] text-[11px] uppercase tracking-[0.1em] text-neutral-600">
                <tr>{b.head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-200">{r.map((c, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? "font-semibold" : ""}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.caption && <figcaption className="mt-2 text-[12px] leading-5 text-neutral-500">{b.caption}</figcaption>}
        </figure>
      );
    case "stats":
      return (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {b.items.map((s) => (
            <div key={s.label} className="rounded-2xl bg-[#1A1A1A] p-5 text-white">
              <p className="font-serif text-[30px] leading-none">{s.value}</p>
              <p className="mt-2 text-[12px] leading-5 text-neutral-300">{s.label}</p>
            </div>
          ))}
        </div>
      );
    case "callout":
      return (
        <aside className="mt-8 rounded-2xl border-l-4 border-[#C9A96E] bg-[#FAF6EE] p-5">
          {b.title && <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[hsl(27_65%_42%)]">{b.title}</p>}
          <p className="mt-1 text-[16px] leading-7 text-neutral-800">{b.text}</p>
        </aside>
      );
    case "quote":
      return (
        <blockquote className="mt-8 border-l-2 border-neutral-300 pl-5 font-serif text-xl italic text-neutral-700">
          {b.text}{b.by && <cite className="mt-2 block text-sm not-italic text-neutral-500">— {b.by}</cite>}
        </blockquote>
      );
  }
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  if (!a) notFound();
  const url = `${BASE}/blog/${a.slug}`;
  const related = (a.related || []).map(getArticle).filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];
  const jsonLd: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.description,
      datePublished: a.published,
      dateModified: a.updated || a.published,
      mainEntityOfPage: url,
      image: `${url}/opengraph-image`,
      author: { "@type": "Organization", name: "RunwayTwin", url: BASE },
      publisher: { "@type": "Organization", name: "RunwayTwin", url: BASE },
      keywords: a.tags.join(", "),
      ...(a.sources?.length ? { citation: a.sources.map((s) => ({ "@type": "CreativeWork", name: s.name, url: s.url })) } : {}),
      ...(a.dataset ? { isBasedOn: { "@type": "Dataset", name: "RunwayTwin Dupe Index", url: `${BASE}/dupe-index` } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Journal", item: `${BASE}/blog` },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
  ];
  if (a.faq?.length) jsonLd.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: a.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl px-5 pb-16 pt-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span> <Link href="/blog" className="hover:underline">Journal</Link>
        </nav>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">{a.kicker}</p>
        <h1 className="mt-4 font-serif text-[36px] leading-[1.06] tracking-tight md:text-[52px]">{a.title}</h1>
        <p className="mt-5 text-[19px] leading-8 text-neutral-700">{a.dek}</p>
        <p className="mt-5 text-[13px] text-neutral-500">RunwayTwin Journal · {date(a.published)} · {a.readMins} min read</p>
        <div className="mt-6 border-t border-neutral-200" />
        {a.body.map((b, i) => <Render key={i} b={b} />)}

        {a.cta && (
          <div className="mt-12 rounded-3xl bg-[#1A1A1A] p-7 text-white">
            <p className="font-serif text-2xl">{a.cta.text}</p>
            <a href={a.cta.href} className="mt-4 inline-flex rounded-full bg-[#C9A96E] px-6 py-3 text-sm font-semibold text-[#1A1A1A]">Open RunwayTwin</a>
          </div>
        )}

        {a.faq?.length ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl">Questions</h2>
            <div className="mt-4 space-y-3">
              {a.faq.map((f) => (
                <div key={f.q} className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <h3 className="text-[15px] font-semibold">{f.q}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {a.sources?.length ? (
          <section className="mt-10 text-sm">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-neutral-500">Sources</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-700">
              {a.sources.map((s) => <li key={s.url}><a href={s.url} rel="noopener" target="_blank" className="underline underline-offset-2">{s.name}</a></li>)}
            </ol>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl bg-[#F3EFE7] p-5 text-sm leading-6 text-neutral-700">
          <p className="font-semibold text-neutral-900">Cite this</p>
          <p className="mt-1">RunwayTwin Journal, &ldquo;{a.title}&rdquo;, {date(a.published)}. {url}</p>
        </section>

        {related.length > 0 && (
          <nav className="mt-12 border-t border-neutral-200 pt-6" aria-label="Related">
            <p className="text-sm font-semibold">Read next</p>
            <ul className="mt-3 space-y-2">{related.map((r) => <li key={r.slug}><Link href={`/blog/${r.slug}`} className="font-serif text-lg underline underline-offset-4">{r.title}</Link></li>)}</ul>
          </nav>
        )}
      </article>
    </div>
  );
}
