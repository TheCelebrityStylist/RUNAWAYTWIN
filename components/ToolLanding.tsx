import Link from "next/link";
import type { Metadata } from "next";
import { TOOLS, type ToolPage } from "@/lib/tools";
import { CELEBS } from "@/lib/celebs";

const BASE = "https://runwaytwin.com";

export function toolMetadata(t: ToolPage): Metadata {
  const url = `${BASE}/${t.slug}`;
  return {
    title: { absolute: `${t.title} | RunwayTwin` },
    description: t.description,
    alternates: { canonical: url },
    openGraph: { title: t.title, description: t.description, url, type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: t.title, description: t.description },
  };
}

export default function ToolLanding({ t }: { t: ToolPage }) {
  const url = `${BASE}/${t.slug}`;
  const others = TOOLS.filter((x) => x.slug !== t.slug);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `RunwayTwin — ${t.eyebrow}`,
      url,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: t.eyebrow, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-4xl px-5 pt-14 pb-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
          <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span> <span>{t.eyebrow}</span>
        </nav>
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">{t.eyebrow}</p>
        <h1 className="font-serif text-[40px] leading-[1.05] tracking-tight md:text-[56px]">{t.h1}</h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-7 text-neutral-700">{t.lede}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/shop-the-look" className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90">
            {t.cta}
          </Link>
          <span className="text-xs text-neutral-500">3 free looks a month · no card needed</span>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <ol className="mx-auto grid max-w-4xl grid-cols-1 gap-5 px-5 py-12 md:grid-cols-3">
          {t.steps.map(([h, d], i) => (
            <li key={h} className="rounded-2xl border border-neutral-200 bg-[#FAF9F6] p-6">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-bold text-white">{i + 1}</span>
              <h2 className="mt-4 text-base font-semibold">{h}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <article className="mx-auto max-w-3xl px-5 py-12">
        {t.sections.map((s) => (
          <section key={s.h2} className="mb-10">
            <h2 className="font-serif text-2xl tracking-tight md:text-3xl">{s.h2}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-4 text-[15px] leading-7 text-neutral-700">{p}</p>
            ))}
          </section>
        ))}

        <section className="mb-10">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">Start from a celebrity instead</h2>
          <p className="mt-4 text-[15px] leading-7 text-neutral-700">No photo? Type a name and work from their signature style.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {CELEBS.map((c) => (
              <li key={c.slug}>
                <Link href={`/style/${c.slug}`} className="inline-block rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50">
                  {c.name} outfits
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="font-serif text-2xl tracking-tight md:text-3xl">Questions</h2>
          <div className="mt-5 space-y-3">
            {t.faq.map((f) => (
              <details key={f.q} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold">{f.q}</summary>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="rounded-3xl bg-[#F3EFE7] p-8">
          <p className="font-serif text-2xl">Got the photo? You're ten seconds away.</p>
          <Link href="/shop-the-look" className="mt-5 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90">
            {t.cta}
          </Link>
        </div>

        <nav aria-label="Related tools" className="mt-12 border-t border-neutral-200 pt-6 text-sm">
          <p className="font-semibold">Also on RunwayTwin</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {others.map((o) => (
              <li key={o.slug}><Link href={`/${o.slug}`} className="underline underline-offset-4">{o.eyebrow}</Link></li>
            ))}
          </ul>
        </nav>
      </article>
    </div>
  );
}
