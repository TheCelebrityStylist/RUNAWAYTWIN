import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

/* =========================================================================
   RunwayTwin — Home (marketing). The tool itself runs at the app origin;
   every CTA goes through /shop-the-look, /stylist or /pricing (see next.config.js).
   ========================================================================= */

export const metadata: Metadata = {
  title: { absolute: "RunwayTwin — AI Stylist: Shop Any Celebrity Look From a Photo" },
  description:
    "Upload any outfit photo or name a celebrity. RunwayTwin spots every piece — colour, fabric, cut — and shows where to buy it at high-street, mid-range or luxury prices. 3 free looks a month.",
  alternates: { canonical: "https://runwaytwin.com" },
  openGraph: {
    title: "RunwayTwin — See it on them. Wear it tomorrow.",
    description:
      "Upload any outfit photo. See every piece. Shop it at high-street, mid-range or luxury prices.",
    url: "https://runwaytwin.com",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "RunwayTwin" }],
  },
};

const GUIDES = [
  { slug: "zendaya-evening-glam", hub: "zendaya", name: "Zendaya", title: "Evening glam: sculpted shoulders, liquid shine" },
  { slug: "rihanna-street-luxe", hub: "rihanna", name: "Rihanna", title: "Street luxe: volume, edge, easy drama" },
  { slug: "jennifer-lawrence-off-duty", hub: "jennifer-lawrence", name: "Jennifer Lawrence", title: "Off-duty: sleek, pointed, effortless" },
  { slug: "blake-lively-occasion-glam", hub: "blake-lively", name: "Blake Lively", title: "Occasion glam: colour play and polish" },
];

const FAQ = [
  {
    q: "How does RunwayTwin work?",
    a: "Upload a photo of an outfit — a red carpet shot, street style, an Instagram screenshot — or type a celebrity's name. RunwayTwin lists every visible piece with its colour, fabric and cut, and links to similar items at high-street, mid-range and luxury prices.",
  },
  {
    q: "Is it free?",
    a: "Yes. A free account includes 3 looks every month. RunwayTwin Pro is €9.99 per month including VAT for unlimited looks, with the first 7 days free. Cancel anytime.",
  },
  {
    q: "Does it find the exact item?",
    a: "When a logo or signature design is visible, or the brand was credited in press coverage, RunwayTwin names the brand and links to the original. Otherwise it shows close matches. Results are AI suggestions, so the piece may not be the exact one worn.",
  },
  {
    q: "Does RunwayTwin recognise faces?",
    a: "No. It identifies clothes and accessories, never people. Photos are uploaded privately and are not made public.",
  },
  {
    q: "Which shops do you link to?",
    a: "Retailers that ship across Europe, such as Zalando, ASOS and Farfetch. Some links earn us a commission at no extra cost to you; that never changes what the stylist recommends.",
  },
];

function CTA({ href, children, variant = "dark" }: { href: string; children: React.ReactNode; variant?: "dark" | "light" }) {
  const base = "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition";
  const style =
    variant === "dark"
      ? "bg-black text-white shadow-lg hover:opacity-90"
      : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50";
  return (
    <Link href={href} className={`${base} ${style}`}>
      {children}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "RunwayTwin",
              url: "https://runwaytwin.com",
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "RunwayTwin",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              offers: [
                { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR" },
                { "@type": "Offer", name: "RunwayTwin Pro", price: "9.99", priceCurrency: "EUR" },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]),
        }}
      />

      {/* ================================ HERO ================================ */}
      <section aria-labelledby="hero-title" className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-16 pb-14 md:grid-cols-[1.15fr_0.85fr]">
        <div>
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[hsl(27_65%_42%)]">
          Shop the look · <Link href="/ai-stylist" className="hover:underline">AI personal stylist</Link>
        </p>
        <h1 id="hero-title" className="max-w-3xl font-serif text-[44px] leading-[1.02] tracking-tight md:text-[68px]">
          See it on them.{" "}
          <span className="italic text-[hsl(27_65%_42%)]">Wear it tomorrow.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-7 text-neutral-700">
          Drop in a photo of any outfit — or just type a name. RunwayTwin spots every piece and shows you where to buy it: the
          high-street version, the mid-range one, or the luxury original.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CTA href="/shop-the-look">Shop a look from a photo</CTA>
          <CTA href="/blog" variant="light">Read the style guides</CTA>
        </div>
        <p className="mt-4 text-xs text-neutral-500">Free to start · no card needed · 3 looks every month</p>
        </div>
        <div className="relative hidden md:block">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-2xl shadow-black/15">
            <Image
              src="/lookbook.jpg"
              alt="Model in a belted grey cotton trench coat"
              fill
              priority
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-5 -left-6 w-64 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(27_65%_42%)]">Example result</p>
            <p className="mt-1 text-sm font-semibold">Grey belted cotton trench coat</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <span className="rounded-lg bg-[#F3EFE7] py-1.5">High street</span>
              <span className="rounded-lg bg-[#F3EFE7] py-1.5">Mid-range</span>
              <span className="rounded-lg bg-black py-1.5 text-white">Luxury</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section aria-labelledby="how-title" className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 id="how-title" className="font-serif text-3xl tracking-tight">How it works</h2>
          <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              ["Drop the photo", "A red carpet, a street-style shot, a screenshot from Instagram. Full-body shots work best."],
              ["Every piece, spotted", "Colour, fabric and cut for each item. The brand too, when a logo or signature design is visible."],
              ["Shop it three ways", "High street, mid-range or the luxury original. See the whole look's price at each level."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-neutral-200 bg-[#FAF9F6] p-6">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <CTA href="/shop-the-look">Try it with your own photo</CTA>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li><Link href="/find-clothes-from-picture" className="underline underline-offset-4">Find clothes from a picture</Link></li>
            <li><Link href="/celebrity-outfit-finder" className="underline underline-offset-4">Celebrity outfit finder</Link></li>
            <li><Link href="/find-dress-from-photo" className="underline underline-offset-4">Find a dress from a photo</Link></li>
            <li><Link href="/identify-clothing-brand-from-photo" className="underline underline-offset-4">Identify a clothing brand</Link></li>
            <li><Link href="/ai-outfit-finder" className="underline underline-offset-4">AI outfit finder</Link></li>
          </ul>
        </div>
      </section>

      {/* ============================ STYLE GUIDES ============================ */}
      <section aria-labelledby="guides-title" className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 id="guides-title" className="font-serif text-3xl tracking-tight">Celebrity style, decoded</h2>
          <Link href="/style" className="text-sm font-medium underline underline-offset-4">All celebrity styles</Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map((g) => (
            <article key={g.slug} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <Link href={`/style/${g.hub}`} className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 hover:underline">{g.name}</Link>
              <h3 className="mt-2 text-base font-semibold leading-snug">
                <Link href={`/blog/${g.slug}`} className="hover:underline">{g.title}</Link>
              </h3>
              <div className="mt-auto flex gap-3 pt-5 text-sm">
                <Link href={`/blog/${g.slug}`} className="underline underline-offset-4">Read</Link>
                <Link
                  href={`/shop-the-look?celebrity=${encodeURIComponent(g.name)}`}
                  className="font-semibold text-[hsl(27_65%_42%)] underline underline-offset-4"
                >
                  Shop {g.name.split(" ")[0]}&apos;s looks
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =============================== PRICING ============================== */}
      <section aria-labelledby="pricing-title" className="mx-auto max-w-6xl px-5 pb-14">
        <h2 id="pricing-title" className="font-serif text-3xl tracking-tight">Simple pricing</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="text-sm font-semibold">Free</p>
            <p className="mt-2 font-serif text-4xl">€0</p>
            <p className="mt-3 text-sm leading-6 text-neutral-700">3 AI looks every month, every piece linked to shops, saved looks and your virtual closet.</p>
          </div>
          <div className="rounded-2xl bg-black p-6 text-white">
            <p className="text-sm font-semibold text-[hsl(35_60%_70%)]">RunwayTwin Pro</p>
            <p className="mt-2 font-serif text-4xl">€9.99<span className="text-base text-neutral-400"> / month</span></p>
            <p className="mt-3 text-sm leading-6 text-neutral-300">Unlimited looks and refinements. First 7 days free, then €9.99 a month including VAT. Cancel anytime.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <CTA href="/shop-the-look">Start free</CTA>
          <CTA href="/pricing" variant="light">Pricing details</CTA>
        </div>
      </section>

      {/* ================================= FAQ ================================ */}
      <section aria-labelledby="faq-title" className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h2 id="faq-title" className="font-serif text-3xl tracking-tight">Straight answers</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-neutral-200 bg-[#FAF9F6] p-5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold">{f.q}</summary>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== FINAL CTA ============================= */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#F3EFE7] p-8 md:flex-row md:items-center">
          <div>
            <p className="font-serif text-2xl">Screenshot it. Shop it.</p>
            <p className="mt-1 text-sm text-neutral-700">Your next outfit is already on someone&apos;s feed.</p>
          </div>
          <CTA href="/shop-the-look">Shop a look from a photo</CTA>
        </div>
      </section>
    </main>
  );
}
