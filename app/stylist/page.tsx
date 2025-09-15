// app/stylist/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import StylistChat from "../../components/StylistChat";

/* =============================================================================
   RunwayTwin — Stylist (Luxury • Conversational • CRO)
   - Server Component (no "use client"); only StylistChat is client-side
   - Header/announcement/footer are handled globally in app/layout.tsx (to avoid duplicates)
   - Sections kept: Hero • Preferences + Chat • Styled Look shell • How it works • Pro tips • FAQ • Final CTA
   ============================================================================= */

export const metadata: Metadata = {
  title: "Stylist — RunwayTwin │ Talk to a Celebrity-grade AI Stylist",
  description:
    "Chat with your AI stylist. Drop a celebrity muse or image + occasion and budget. Get a head-to-toe outfit with working EU/US links.",
  alternates: { canonical: "https://runwaytwin.vercel.app/stylist" },
  openGraph: {
    title: "Stylist — RunwayTwin",
    description:
      "Conversational AI stylist with editor-level taste, body-type logic, and live EU/US stock.",
    url: "https://runwaytwin.vercel.app/stylist",
    siteName: "RunwayTwin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RunwayTwin — Stylist",
    description:
      "Drop a muse + occasion + budget. Get a refined outfit with live shop links.",
  },
  icons: { icon: "/favicon.ico" },
};

/* --------------------------------- UI atoms -------------------------------- */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

function CTA({
  href,
  children,
  variant = "dark",
  aria,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "dark" | "light";
  aria?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20";
  const style =
    variant === "dark"
      ? "bg-black text-white hover:opacity-90"
      : "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50";
  return (
    <Link href={href} aria-label={aria} className={`${base} ${style}`}>
      {children}
    </Link>
  );
}

function Card({
  title,
  children,
  eyebrow,
}: {
  title: string;
  children: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <article className="rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-sm">
      {eyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-1 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{children}</p>
    </article>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function StylistPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
      {/* ================================== HERO =================================== */}
      <section aria-labelledby="hero-title" className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(63%_60%_at_20%_0%,#fff,transparent),radial-gradient(60%_60%_at_80%_0%,#fff,transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>Editorial Taste</Badge>
            <Badge>Body-Type Flattering</Badge>
            <Badge>Budget-True</Badge>
            <Badge>EU/US Stock</Badge>
            <Badge>Capsule-Friendly</Badge>
          </div>

          <h1 id="hero-title" className="font-serif text-4xl leading-[1.08] tracking-tight sm:text-[44px]">
            Speak to your stylist —{" "}
            <span className="text-[hsl(27_65%_42%)]">get a wearable look, fast.</span>
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-neutral-700">
            Drop a celebrity muse or image + tell me the occasion and your budget tier.
            I’ll curate a head-to-toe outfit with working links (EU/US), tuned to flatter.
          </p>
        </div>
      </section>

      {/* ======================= Preferences + Live Conversational Chat ======================= */}
      <section className="mx-auto max-w-6xl px-5 pb-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Preferences panel */}
          <aside className="rounded-2xl border border-neutral-200 bg-white/80 p-5 shadow-sm">
            <h2 className="text-base font-semibold">Your Preferences</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-neutral-600">Country</label>
              <select className="w-full rounded-full border border-neutral-300 px-3 py-2 text-sm">
                <option>EU Stock</option>
                <option>US Stock</option>
              </select>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-600">Top size</label>
                  <input defaultValue="M" className="w-full rounded-full border border-neutral-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600">Bottom size</label>
                  <input defaultValue="M" className="w-full rounded-full border border-neutral-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600">Shoe EU</label>
                  <input defaultValue="38" className="w-full rounded-full border border-neutral-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-600">Body type (optional)</label>
                  <select className="w-full rounded-full border border-neutral-300 px-3 py-2 text-sm">
                    <option>—</option>
                    <option>Pear</option>
                    <option>Hourglass</option>
                    <option>Apple</option>
                    <option>Rectangle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600">Budget tier</label>
                  <select className="w-full rounded-full border border-neutral-300 px-3 py-2 text-sm">
                    <option>High-street (€30–120)</option>
                    <option selected>Mid (€80–300)</option>
                    <option>Luxury (€300+)</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs text-neutral-600">
                <p className="font-medium text-neutral-800">Style Intelligence</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Vision detects celeb & extracts palette/silhouette</li>
                  <li>Occasion, body-type & budget parsing</li>
                  <li>Live retailer search links (affiliate-ready)</li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Conversational chat (client component streams + uses tools) */}
          <div className="rounded-2xl border border-neutral-200 bg-white/80 p-0 shadow-sm">
            <StylistChat />
          </div>
        </div>
      </section>

      {/* ============================== Styled Look shell ============================== */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">Your Styled Look</h2>
        <p className="mt-1 text-sm text-neutral-600">
          As you chat, I’ll surface working shop links here — title • retailer • price. (EU/US stock.)
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Waiting for your first look">
            Ask for a celebrity + occasion + budget, e.g. “Zendaya, modern work, mid.”
          </Card>
          <Card title="Pro tip">
            Add shoe size and body type for better silhouettes. Try: “party in Rome, wide-leg friendly, EU 38.”
          </Card>
        </div>
      </section>

      {/* =============================== How it works =============================== */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card eyebrow="Step 1" title="Tell me your muse">
            Drop a celebrity name or upload an image. I extract palette, silhouette and key signatures.
          </Card>
          <Card eyebrow="Step 2" title="Occasion & budget">
            Everyday, work, evening, travel — and your band: high-street / mid / luxury.
          </Card>
          <Card eyebrow="Step 3" title="Shop the look">
            Get a head-to-toe outfit that flatters your body type, with live EU/US product links.
          </Card>
        </div>
      </section>

      {/* ================================ Pro tips ================================ */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">Stylist pro tips</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Make it personal">
            Include your shoe size and a fit note (e.g., “prefer high rise”, “no crop tops”). I’ll adapt the cut.
          </Card>
          <Card title="Capsule-friendly">
            Mention a piece you own (“black wide-leg trouser”) and I’ll build around it for maximum wear.
          </Card>
        </div>
      </section>

      {/* =================================== FAQ =================================== */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Will it suit my body type?">
            Yes — my silhouette rules balance pear/hourglass/apple/rectangle so proportions flatter.
          </Card>
          <Card title="Can I stay within budget?">
            Choose high-street, mid or luxury. I curate strictly in-band — no surprise totals.
          </Card>
          <Card title="Is stock live for EU/US?">
            Yes — I fetch retailer links with regional sizes and currency.
          </Card>
          <Card title="Risk-free to try?">
            Start with a €5 one-off, or Premium (€19/mo) with a 7-day money-back guarantee.
          </Card>
        </div>
      </section>

      {/* ================================ Final CTA ================================ */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold">Look expensive — spend smart.</p>
              <p className="mt-1 text-sm text-neutral-700">
                The fastest way from celebrity inspiration to outfits you actually wear.
              </p>
            </div>
            <div className="flex gap-3">
              <CTA href="/stylist">Start Styling</CTA>
              <CTA href="/pricing" variant="light">
                See Plans
              </CTA>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
