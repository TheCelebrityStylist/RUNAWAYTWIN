import type { Metadata } from "next";
import Link from "next/link";
import { getDupeIndex, euro, fmtDate } from "@/lib/drops";

const BASE = "https://runwaytwin.com";
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const x = await getDupeIndex();
  const pct = Math.max(1, Math.round(x.medianShare * 100));
  const title = "The Dupe Index: How Cheaply Celebrity Looks Can Be Recreated";
  const description = x.looks
    ? `This week's celebrity looks can be recreated at ${x.medianScore}% resemblance for ${pct}% of the original price (median of ${x.looks} looks). Updated daily from RunwayTwin's Drop Radar.`
    : "How cheaply this week's celebrity looks can be recreated, updated daily.";
  return {
    title: { absolute: `${title} | RunwayTwin` },
    description,
    alternates: { canonical: `${BASE}/dupe-index` },
    openGraph: { title, description, url: `${BASE}/dupe-index`, type: "article" },
  };
}

export default async function DupeIndex() {
  const x = await getDupeIndex();
  const pct = Math.max(1, Math.round(x.medianShare * 100));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "RunwayTwin Dupe Index",
    description: "Celebrity looks covered in fashion press, broken down by piece, with the price of the original outfit and the cheapest close recreation (Twin Score = AI-estimated resemblance).",
    url: `${BASE}/dupe-index`,
    creator: { "@type": "Organization", name: "RunwayTwin", url: BASE },
    license: "https://creativecommons.org/licenses/by/4.0/",
    dateModified: x.updated,
    distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${BASE}/dupe-index.json` }],
    variableMeasured: ["Twin Score (%)", "Recreation cost (EUR)", "Original outfit price (EUR)"],
  };
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">The Dupe Index{x.updated ? ` · updated ${fmtDate(x.updated.slice(0, 10))}` : ""}</p>
      <h1 className="font-serif text-[36px] leading-[1.05] tracking-tight md:text-[56px]">
        {x.looks ? <>This week&apos;s celebrity looks cost <span className="italic">{pct}%</span> of the original to recreate.</> : "How cheaply can celebrity looks be recreated?"}
      </h1>
      {x.looks > 0 && (
        <>
          <p className="mt-5 text-[16px] leading-7 text-neutral-700">
            Median of {x.looks} looks from the last days of fashion coverage: the originals come to about {euro(x.medianOriginals)}, and the best-value recreation gets {x.medianScore}% of the look for about {euro(x.medianCost)}.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              [`${pct}%`, "of the original price"],
              [`${x.medianScore}%`, "median Twin Score"],
              [String(x.looks), "looks analysed"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-[#1A1A1A] p-5 text-white">
                <p className="font-serif text-4xl">{v}</p>
                <p className="mt-1 text-[12px] text-neutral-300">{l}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-12 font-serif text-2xl md:text-3xl">Easiest looks to twin</h2>
          <p className="mt-2 text-sm text-neutral-600">Most resemblance per euro.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                <tr><th className="py-2 pr-3">Look</th><th className="py-2 pr-3">Twin Score</th><th className="py-2 pr-3">Recreate for</th><th className="py-2">Original</th></tr>
              </thead>
              <tbody>
                {x.easiest.map((r) => (
                  <tr key={r.slug} className="border-t border-neutral-200">
                    <td className="py-3 pr-3"><Link href={`/looks/${r.slug}`} className="font-semibold underline underline-offset-2">{r.celebrity}</Link><span className="block text-[12px] text-neutral-500">{r.event}</span></td>
                    <td className="py-3 pr-3">{r.score}%</td>
                    <td className="py-3 pr-3">{euro(r.cost)}</td>
                    <td className="py-3">{euro(r.originals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {x.hardest.length > 0 && (
            <>
              <h2 className="mt-12 font-serif text-2xl md:text-3xl">Hardest to fake</h2>
              <p className="mt-2 text-sm text-neutral-600">Looks where no affordable version comes close: couture, one-off vintage, sculpted construction.</p>
              <ul className="mt-4 space-y-2 text-[15px]">
                {x.hardest.map((r) => <li key={r.slug}><Link href={`/looks/${r.slug}`} className="underline underline-offset-2">{r.celebrity}, {r.event}</Link>: best affordable version {r.score}%</li>)}
              </ul>
            </>
          )}

          {x.designers.length > 0 && (
            <>
              <h2 className="mt-12 font-serif text-2xl md:text-3xl">Most-worn designers</h2>
              <p className="mt-4 text-[15px] leading-7 text-neutral-700">{x.designers.map((d) => `${d.name} (${d.looks})`).join(" · ")}</p>
            </>
          )}
        </>
      )}

      <section className="mt-12 rounded-3xl border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.15em] text-neutral-500">Method</h2>
        <p className="mt-2">Every morning RunwayTwin&apos;s Drop Radar collects the celebrity looks most covered by fashion press (Vogue, Who What Wear, Harper&apos;s Bazaar, Elle and others), identifies each piece, prices the credited original and close alternatives at high-street, mid-range and luxury level in euros, and scores how close each alternative gets (Twin Score, an AI estimate weighted by how much each piece defines the look). The recreation shown is the best-value point: past it, each extra euro buys much less resemblance. Prices are estimates.</p>
        <p className="mt-2">The data is open: <a href="/dupe-index.json" className="underline">dupe-index.json</a> (CC BY 4.0). Journalists: cite &quot;RunwayTwin Dupe Index&quot; with a link to this page.</p>
      </section>
    </div>
  );
}
