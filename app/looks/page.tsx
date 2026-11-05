import type { Metadata } from "next";
import Link from "next/link";
import { getDrops, euro, fmtDate } from "@/lib/drops";

const BASE = "https://runwaytwin.com";
export const revalidate = 1800;

const title = "Celebrity Outfits This Week: Every Piece Identified";
const description =
  "What celebrities wore this week, broken down piece by piece: credited designers, close matches at high-street, mid-range and luxury prices, and the best-value way to get each look. Updated every morning.";

export const metadata: Metadata = {
  title: { absolute: `${title} | RunwayTwin` },
  description,
  alternates: { canonical: `${BASE}/looks` },
  openGraph: { title, description, url: `${BASE}/looks`, type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
};

export default async function LooksIndex() {
  const drops = await getDrops(120);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: drops.slice(0, 50).map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/looks/${d.slug}`, name: `${d.celebrity} at ${d.event}` })),
  };
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Drop Radar</p>
      <h1 className="max-w-3xl font-serif text-[38px] leading-[1.05] tracking-tight md:text-[56px]">Worn this week. Broken down by morning.</h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-7 text-neutral-700">
        Every day RunwayTwin reads the fashion press, picks the celebrity looks everyone is covering, and identifies every piece, with the credited designer where there is one and close matches at three prices.
      </p>
      {drops.length === 0 ? (
        <p className="mt-10 text-neutral-600">The first looks land tomorrow morning.</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drops.map((d) => (
            <li key={d.slug} className="flex flex-col rounded-3xl border border-neutral-200 bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{fmtDate(d.look_date)}</p>
              <h2 className="mt-2 font-serif text-2xl leading-tight"><Link href={`/looks/${d.slug}`} className="hover:underline">{d.celebrity}</Link></h2>
              <p className="text-[13px] text-neutral-600">{d.event}</p>
              {d.palette?.length ? <div className="mt-3 flex gap-1">{d.palette.map((h) => <span key={h} className="h-4 w-4 rounded-full ring-1 ring-neutral-200" style={{ backgroundColor: h }} />)}</div> : null}
              <p className="mt-3 flex-1 text-[14px] leading-6 text-neutral-700">{d.summary || d.vibe}</p>
              {d.twin && <p className="mt-4 text-[13px]"><b className="font-serif text-xl">{d.twin.score}%</b> of the look for <b>{euro(d.twin.cost)}</b></p>}
              <Link href={`/looks/${d.slug}`} className="mt-4 inline-flex justify-center rounded-full bg-black px-5 py-2.5 text-[13px] font-semibold text-white">See every piece</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
