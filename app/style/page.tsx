import type { Metadata } from "next";
import Link from "next/link";
import { CELEBS } from "@/lib/celebs";
import { getCelebHubs, HUB_MIN_LOOKS, fmtDate, euro } from "@/lib/drops";
import { breadcrumbLd, ORG_REF, BASE } from "@/lib/seo";

export const revalidate = 3600;

const url = `${BASE}/style`;
const title = "Celebrity Outfits: Every Look, Every Piece";
const description =
  "Celebrity outfits from Hailey Bieber, Zendaya, Rihanna and every star on Drop Radar, broken down piece by piece at high-street, mid and luxury prices.";

export const metadata: Metadata = {
  title: { absolute: `${title} | RunwayTwin` },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description },
};

export default async function StyleIndex() {
  const hubs = await getCelebHubs();
  const editorial = new Set(CELEBS.map((c) => c.slug));
  const latestFor = (slug: string) => hubs.find((h) => h.slug === slug)?.latest;
  const others = hubs.filter((h) => !editorial.has(h.slug));
  const hrefFor = (h: (typeof hubs)[number]) => (h.looks.length >= HUB_MIN_LOOKS ? `/style/${h.slug}` : `/looks/${h.latest.slug}`);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url,
      publisher: ORG_REF,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: [
          ...CELEBS.map((c) => ({ url: `${url}/${c.slug}`, name: `${c.name} outfits` })),
          ...others.map((h) => ({ url: `${BASE}${hrefFor(h)}`, name: `${h.name} outfits` })),
        ].map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })),
      },
    },
    breadcrumbLd([
      { name: "Home", url: BASE },
      { name: "Celebrity style", url },
    ]),
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
        <Link href="/" className="hover:underline">Home</Link> <span aria-hidden>›</span> <span>Celebrity style</span>
      </nav>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Celebrity style</p>
      <h1 className="max-w-3xl font-serif text-[40px] leading-[1.05] tracking-tight md:text-[56px]">Celebrity outfits, decoded</h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-7 text-neutral-700">
        Two ways in. The style formulas break down the wardrobes people copy most. Drop Radar breaks down what celebrities wore this week, piece by piece, with a close match at every price.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/looks" className="rounded-full border border-neutral-300 bg-white px-4 py-2 hover:bg-neutral-50">This week&apos;s looks</Link>
        <Link href="/pieces" className="rounded-full border border-neutral-300 bg-white px-4 py-2 hover:bg-neutral-50">Shop by piece</Link>
        <Link href="/dupe-index" className="rounded-full border border-neutral-300 bg-white px-4 py-2 hover:bg-neutral-50">The Dupe Index</Link>
      </div>

      <h2 className="mt-12 font-serif text-3xl tracking-tight">Style formulas</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CELEBS.map((c) => {
          const l = latestFor(c.slug);
          return (
            <li key={c.slug} className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <Link href={`/style/${c.slug}`} className="font-serif text-2xl hover:underline">{c.name} outfits</Link>
              <span className="mt-2 text-sm leading-6 text-neutral-700">{c.tagline}</span>
              {l && (
                <Link href={`/looks/${l.slug}`} className="mt-3 text-[13px] text-neutral-600 hover:underline">
                  Latest: {l.event}, {fmtDate(l.look_date)}
                </Link>
              )}
              <Link href={`/style/${c.slug}`} className="mt-auto pt-5 text-sm font-semibold text-[hsl(27_65%_42%)]">See the formula →</Link>
            </li>
          );
        })}
      </ul>

      {others.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl tracking-tight">Every celebrity on Drop Radar, A–Z</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-neutral-700">Each name links to their latest look, or to all their looks once there&apos;s more than one.</p>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((h) => (
              <li key={h.slug} className="border-b border-neutral-200 pb-3">
                <Link href={hrefFor(h)} className="font-semibold hover:underline">{h.name}</Link>
                {h.looks.length >= HUB_MIN_LOOKS && <span className="ml-2 text-[12px] text-neutral-500">{h.looks.length} looks</span>}
                <span className="block text-[13px] text-neutral-600">
                  {h.latest.event} · {fmtDate(h.latest.look_date)}
                  {h.latest.twin ? ` · ${h.latest.twin.score}% for ${euro(h.latest.twin.cost)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 rounded-3xl bg-[#F3EFE7] p-8">
        <p className="font-serif text-2xl">Someone else&apos;s outfit on your mind?</p>
        <p className="mt-2 text-sm text-neutral-700">Upload any photo and RunwayTwin finds every piece.</p>
        <Link href="/celebrity-outfit-finder" className="mt-5 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90">
          Celebrity outfit finder
        </Link>
      </div>
    </div>
  );
}
