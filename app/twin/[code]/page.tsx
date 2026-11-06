import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTwin } from "@/lib/twins";
import { CELEBS } from "@/lib/celebs";
import { slugOfCeleb } from "@/lib/drops";

export const revalidate = 86400;
const APP = "https://app.runwaytwin.com";

const headline = (t: NonNullable<Awaited<ReturnType<typeof getTwin>>>) =>
  t.mode === "closet" ? `This closet is ${t.matches[0].percent}% ${t.matches[0].celebrity}` : `This outfit is ${t.matches[0].percent}% ${t.matches[0].celebrity}`;

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const t = await getTwin(params.code);
  if (!t) return { title: "Style Twin", robots: { index: false } };
  const title = `${headline(t)} · Who do you dress like?`;
  const description = `${t.style_name ? t.style_name + ". " : ""}Find your Style Twin from one mirror selfie: free, clothes only, never your face.`;
  // Personal results are for sharing, not for search: keep them out of the index.
  return { title: { absolute: title }, description, robots: { index: false, follow: true }, openGraph: { title, description, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function TwinPage({ params }: { params: { code: string } }) {
  const t = await getTwin(params.code);
  if (!t) notFound();
  const top = t.matches[0];
  const hub = CELEBS.find((c) => c.slug === slugOfCeleb(top.celebrity));
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="rounded-3xl bg-[#1A1A1A] p-8 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#C9A96E]">Style Twin</p>
        <h1 className="mt-3 font-serif text-[44px] leading-[1.02] md:text-[60px]">
          {t.mode === "closet" ? "This closet is" : "This outfit is"} <span className="block">{top.percent}% {top.celebrity}</span>
        </h1>
        {t.style_name && <p className="mt-4 text-[15px] text-neutral-300"><b className="text-white">{t.style_name}.</b> {t.style_line}</p>}
        <a href={`${APP}/StyleTwin`} className="mt-6 inline-flex rounded-full bg-[#C9A96E] px-7 py-4 text-sm font-semibold text-[#1A1A1A]">Who do you dress like?</a>
        <p className="mt-3 text-[12px] text-neutral-400">One mirror selfie. Free, no account. We read the clothes, never the face.</p>
      </div>
      <ol className="mt-6 space-y-3">
        {t.matches.map((m, i) => (
          <li key={m.celebrity} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-serif text-xl">{i + 1}. {m.celebrity}</p>
              <p className="font-serif text-2xl">{m.percent}%</p>
            </div>
            {m.why && <p className="mt-1 text-[14px] leading-6 text-neutral-700">{m.why}</p>}
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        {hub && <Link href={`/style/${hub.slug}`} className="underline underline-offset-4">How {hub.short} dresses →</Link>}
        <a href={`${APP}/OutfitBreakdown?celebrity=${encodeURIComponent(top.celebrity)}`} className="underline underline-offset-4">Shop a {top.celebrity.split(" ")[0]} look →</a>
      </div>
    </div>
  );
}
