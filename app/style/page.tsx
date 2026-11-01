import type { Metadata } from "next";
import Link from "next/link";
import { CELEBS } from "@/lib/celebs";

const url = "https://runwaytwin.com/style";
const title = "Celebrity Outfits & Style Formulas — Shop Their Looks";
const description =
  "The style formulas of Hailey Bieber, Zendaya, Rihanna, Sofia Richie, Taylor Swift and more — the key pieces to buy and how to get each look at high-street, mid-range or luxury prices.";

export const metadata: Metadata = {
  title: { absolute: `${title} | RunwayTwin` },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
};

export default function StyleIndex() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url,
    hasPart: CELEBS.map((c) => ({ "@type": "Article", headline: `${c.name} outfits`, url: `${url}/${c.slug}` })),
  };
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">Celebrity style</p>
      <h1 className="max-w-3xl font-serif text-[40px] leading-[1.05] tracking-tight md:text-[56px]">Celebrity outfits, decoded</h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-7 text-neutral-700">
        Every great personal style comes down to a formula: a few shapes, a few colours, a few pieces repeated. Here are the formulas behind the most-copied wardrobes, and where to buy each piece at the price you want.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CELEBS.map((c) => (
          <li key={c.slug}>
            <Link href={`/style/${c.slug}`} className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <span className="font-serif text-2xl">{c.name}</span>
              <span className="mt-2 text-sm leading-6 text-neutral-700">{c.tagline}</span>
              <span className="mt-auto pt-5 text-sm font-semibold text-[hsl(27_65%_42%)]">See the formula →</span>
            </Link>
          </li>
        ))}
      </ul>
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
