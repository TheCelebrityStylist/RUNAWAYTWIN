import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, getEvents, euro, fmtDate } from "@/lib/drops";

const BASE = "https://runwaytwin.com";
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getEvents()).map((e) => ({ slug: e.slug }));
}

const titleOf = (name: string, year: string) => `${name} ${year}: what everyone wore, every piece identified`;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = await getEvent(params.slug);
  if (!e) return { title: "Event not found", robots: { index: false } };
  const names = e.looks.slice(0, 4).map((d) => d.celebrity).join(", ");
  const description = `${e.name} ${e.year} red carpet: ${names}${e.looks.length > 4 ? " and more" : ""}. Every outfit broken down with credited designers and close matches at three prices.`;
  const url = `${BASE}/events/${e.slug}`;
  return {
    title: { absolute: `${titleOf(e.name, e.year)} | RunwayTwin` },
    description,
    alternates: { canonical: url },
    openGraph: { title: titleOf(e.name, e.year), description, url, type: "article", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const e = await getEvent(params.slug);
  if (!e) notFound();
  const url = `${BASE}/events/${e.slug}`;
  const designers = [...new Set(e.looks.flatMap((d) => d.items.filter((i) => i.brand && i.brand_confidence === "high").map((i) => i.brand as string)))];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: titleOf(e.name, e.year),
      dateModified: e.latest,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "RunwayTwin", url: BASE },
      publisher: { "@type": "Organization", name: "RunwayTwin", url: BASE },
      about: { "@type": "Event", name: `${e.name} ${e.year}` },
      mentions: e.looks.map((d) => ({ "@type": "Person", name: d.celebrity })),
    },
    { "@context": "https://schema.org", "@type": "ItemList", itemListElement: e.looks.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/looks/${d.slug}`, name: `${d.celebrity} at ${e.name}` })) },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Celebrity looks", item: `${BASE}/looks` },
        { "@type": "ListItem", position: 3, name: `${e.name} ${e.year}`, item: url },
      ],
    },
  ];
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span> <Link href="/looks" className="hover:underline">Celebrity looks</Link> <span aria-hidden>›</span> <span>{e.name}</span>
      </nav>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Red carpet · {e.year}</p>
      <h1 className="font-serif text-[36px] leading-[1.06] tracking-tight md:text-[52px]">{e.name} {e.year}: what everyone wore</h1>
      <p className="mt-5 text-[16px] leading-7 text-neutral-700">
        {e.looks.length} looks from {e.name}, each broken down piece by piece{designers.length ? `. Designers credited in coverage include ${designers.slice(0, 8).join(", ")}` : ""}. Tap any look for every piece at high-street, mid-range and luxury prices.
      </p>
      <ol className="mt-10 space-y-4">
        {e.looks.map((d, i) => (
          <li key={d.slug} className="rounded-3xl border border-neutral-200 bg-white p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{i + 1} · {fmtDate(d.look_date)}</p>
            <h2 className="mt-1 font-serif text-2xl"><Link href={`/looks/${d.slug}`} className="hover:underline">{d.celebrity}</Link></h2>
            {d.summary && <p className="mt-2 text-[15px] leading-7 text-neutral-700">{d.summary}</p>}
            {d.twin && <p className="mt-3 text-[13px]"><b>{d.twin.score}%</b> of the look for <b>{euro(d.twin.cost)}</b> · originals ~{euro(d.twin.originals)}</p>}
            <Link href={`/looks/${d.slug}`} className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-[13px] font-semibold text-white">Every piece</Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
