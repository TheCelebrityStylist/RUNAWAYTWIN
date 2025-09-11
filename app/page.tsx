"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";

/**
 * RunwayTwin — Home (Client Component)
 * ------------------------------------------------------------
 * - Premium hero with persuasive copy & strong CTAs
 * - Clear value props + proof stats + trust logos
 * - SEO-friendly headings & semantic structure
 * - Lightweight, no external images required
 * - Clean Tailwind classes (works with default Tailwind setup)
 *
 * NOTE:
 *  - Because we use React hooks for small interactions, the page is
 *    a Client Component and intentionally does NOT export metadata.
 *  - Put structured data + canonical in `app/layout.tsx` instead.
 */

/* ----------------------------- THEME TOKENS ----------------------------- */

const brand = {
  name: "RunwayTwin",
  emoji: "✨",
  colors: {
    ink: "text-zinc-900",
    sub: "text-zinc-600",
    card: "bg-white/80",
    shell: "bg-[#FBF9F6]", // refined off-white for premium feel
    accent: "text-[#B86B35]", // warm luxe copper
    accentBg: "bg-[#B86B35]",
    ring: "ring-zinc-900/10",
    shadow: "shadow-[0_10px_30px_rgba(0,0,0,0.07)]",
  },
  radius: {
    xl: "rounded-3xl",
    lg: "rounded-2xl",
    md: "rounded-xl",
    pill: "rounded-full",
  },
};

/* ------------------------------ UI HELPERS ------------------------------ */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-zinc-200/80 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur">
      {children}
    </span>
  );
}

function Button({
  children,
  href,
  variant = "primary",
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "ghost" | "outline";
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10";

  const styles =
    variant === "primary"
      ? `${brand.colors.accentBg} text-white ${brand.radius.pill} shadow-sm hover:opacity-95`
      : variant === "outline"
      ? `border border-zinc-200 ${brand.radius.pill} bg-white text-zinc-900 hover:bg-zinc-50`
      : `bg-transparent text-zinc-900 ${brand.radius.pill} hover:bg-zinc-100`;

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel || undefined} className={`${base} ${styles}`}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={ariaLabel || undefined} onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function Card({
  title,
  children,
  eyebrow,
  footer,
  className = "",
}: {
  title?: string | React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: string | React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`${brand.radius.xl} ${brand.colors.card} ${brand.colors.shadow} ring-1 ring-black/5 p-6 sm:p-7 ${className}`}
    >
      {eyebrow ? <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">{eyebrow}</div> : null}
      {title ? (
        <h3 className="text-lg font-semibold text-zinc-900">
          {title}
        </h3>
      ) : null}
      {children ? <div className={`${title ? "mt-2" : ""} text-sm leading-6 text-zinc-700`}>{children}</div> : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className={`${brand.radius.xl} ${brand.colors.card} ${brand.colors.shadow} ring-1 ring-black/5 p-6 sm:p-8 text-center`}
    >
      <div className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
      <div className="mt-1 text-sm text-zinc-600">{label}</div>
    </div>
  );
}

/* ------------------------------- FAQ ITEM ------------------------------- */

function FaqItem({
  q,
  a,
  defaultOpen = false,
}: {
  q: string;
  a: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`${brand.radius.lg} border border-zinc-200 bg-white p-5 sm:p-6`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base font-medium text-zinc-900">{q}</span>
        <span className="grid h-6 w-6 place-items-center rounded-full border border-zinc-300 text-xs text-zinc-600">
          {open ? "–" : "+"}
        </span>
      </button>
      {open && <p className="mt-3 text-sm leading-6 text-zinc-700">{a}</p>}
    </div>
  );
}

/* --------------------------------- PAGE --------------------------------- */

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll to “How it works”
  function goHowItWorks() {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Pre-baked list of retailers (trust & SEO keywords)
  const retailers = useMemo(
    () => ["Net-a-Porter", "Nordstrom", "Zara", "COS", "H&M", "Mango", "& Other Stories"],
    []
  );

  return (
    <main className={`${brand.colors.shell}`}>
      {/* HERO */}
      <header
        ref={heroRef}
        className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:pt-14 md:pt-16 lg:px-8"
        aria-label="RunwayTwin hero section"
      >
        <div className={`${brand.radius.xl} relative isolate overflow-hidden bg-white p-6 sm:p-10 md:p-14 ring-1 ring-black/5 ${brand.colors.shadow}`}>
          {/* Luxe gradient veil */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_400px_at_10%_10%,#fff,transparent)]"></div>
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 mix-blend-multiply bg-[radial-gradient(800px_400px_at_90%_10%,#f7efe7,transparent)]"></div>

          {/* Category badges */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge>AI Vision</Badge>
            <Badge>Live Products</Badge>
            <Badge>Working Links</Badge>
          </div>

          {/* Headline */}
          <h1 className="max-w-4xl text-4xl font-serif tracking-tight text-zinc-900 sm:text-5xl md:text-6xl">
            Your Personal Celebrity Stylist —{" "}
            <span className={`${brand.colors.accent} whitespace-nowrap`}>instantly shoppable.</span>
          </h1>

          {/* Subhead */}
          <p className={`mt-5 max-w-3xl text-base leading-7 ${brand.colors.sub}`}>
            Upload a celebrity photo or name, choose your budget & occasion, and our AI curates a head-to-toe
            look — tailored to your body type. With <b>real retailer links</b> you can shop right now. No dead
            ends. No guesswork.
          </p>

          {/* CTA row */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button href="/stylist" variant="primary" ariaLabel="Start styling now">
              Start Styling
            </Button>
            <Button href="/pricing" variant="outline" ariaLabel="See pricing">
              See Pricing
            </Button>
            <Button href="/blog" variant="ghost" ariaLabel="Read the style guides">
              Style Guides
            </Button>
          </div>

          {/* Value tiles */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card title="Real AI Vision">
              Detects the celeb in your photo, then extracts palette, silhouette & signature style cues.
            </Card>
            <Card title="Live Products (EU/US)">
              Pulls in-stock pieces by price, colour & size across top retailers. Updated in real time.
            </Card>
            <Card title="Instant Shop Links">
              Affiliate-ready links that open the <b>actual product pages</b> — zero drop-off.
            </Card>
          </div>

          {/* Retailers marquee */}
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Retailers we love</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-700">
              {retailers.map((r) => (
                <span key={r} className="whitespace-nowrap">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* HOW IT WORKS + PROOF */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 pb-6 lg:px-8">
        <h2 className="text-2xl font-serif tracking-tight text-zinc-900 sm:text-3xl">How It Works</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card title="1) Drop your muse">
            Upload a celeb photo or type a name with occasion & budget.
          </Card>
          <Card title="2) AI curates the look">
            Vision + text models decode palette, silhouette & body-type fit.
          </Card>
          <Card title="3) Shop instantly">
            Open clean retailer pages via affiliate-ready links (optional).
          </Card>
        </div>

        {/* Stats proof */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat value="30k+" label="Looks generated" />
          <Stat value="18–32%" label="Buy-intent uplift (avg.)" />
          <Stat value="EU/US" label="Stock coverage" />
        </div>

        {/* Conversion band */}
        <div
          className={`${brand.radius.xl} ${brand.colors.card} ${brand.colors.shadow} ring-1 ring-black/5 mt-6 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center`}
        >
          <p className="text-sm text-zinc-700">
            <span className="font-semibold">Unlock unlimited styling</span> — seasonal wardrobe plans, live
            retailer feeds, priority coaching & analytics for creators. Pause any time.
          </p>
          <div className="flex items-center gap-3">
            <Button href="/pricing" variant="primary" ariaLabel="Choose the €19/month plan">
              €19/month
            </Button>
            <Button href="/pricing#one-off" variant="outline" ariaLabel="Buy a one-off look for €5">
              One-off look €5
            </Button>
          </div>
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card title="Made for real bodies">
            Our fit logic balances pear/hourglass/apple/rectangle so silhouettes are flattering — not generic.
          </Card>
          <Card title="Links that actually open products">
            We fetch live, in-stock items and link directly to retailer product pages (affiliate optional).
          </Card>
          <Card title="EU/US aware">
            Toggle country preference; we tailor sizes, currencies and retailer availability automatically.
          </Card>
          <Card title="Cancel any time">
            Try a one-off look for €5 or go Premium for €19/month — pause or cancel whenever you want.
          </Card>
        </div>
      </section>

      {/* JOURNAL PREVIEW */}
      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif tracking-tight text-zinc-900 sm:text-3xl">From the Journal</h2>
          <Link href="/blog" className="text-sm font-medium text-zinc-700 hover:underline">
            See all →
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            title="Dress Like Zendaya: Red-Carpet to Real Life"
            footer={
              <Link href="/blog/zendaya-red-carpet" className="text-sm font-medium text-zinc-900 hover:underline">
                Read guide →
              </Link>
            }
          >
            Her formula, colours, and shoppable pieces under €100.
          </Card>
          <Card
            title="Rihanna Streetwear: The Exact Vibe (and Where to Buy)"
            footer={
              <Link href="/blog/rihanna-street-luxe" className="text-sm font-medium text-zinc-900 hover:underline">
                Read guide →
              </Link>
            }
          >
            Oversized outerwear, crop+wide leg, bold accessories — linked.
          </Card>
          <Card
            title="Jennifer Lawrence Minimalism: Workwear Capsule"
            footer={
              <Link href="/blog/jennifer-minimal" className="text-sm font-medium text-zinc-900 hover:underline">
                Read guide →
              </Link>
            }
          >
            Neutral palette, sleek tailoring, pointed shoes.
          </Card>
        </div>
      </section>

      {/* FAQ for objection handling */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-6 lg:px-8">
        <h2 className="text-2xl font-serif tracking-tight text-zinc-900 sm:text-3xl">Frequently Asked</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FaqItem
            q="Does it work with my body type?"
            a={
              <>
                Yes — our fit logic balances pear, hourglass, apple and rectangle so silhouettes are flattering,
                not generic. You can also manually set preferences for fine-tuning.
              </>
            }
            defaultOpen
          />
          <FaqItem
            q="Do the links actually open products?"
            a={
              <>
                Absolutely. We fetch live, in-stock items and link directly to the product page. If you use an
                affiliate redirect, it’s added cleanly without breaking the destination.
              </>
            }
          />
          <FaqItem
            q="EU/US availability?"
            a={
              <>
                You can set EU or US in preferences. We tailor sizing, currency and which retailers we pull from
                automatically.
              </>
            }
          />
          <FaqItem
            q="Cancel any time?"
            a={
              <>
                Of course. Try a one-off look for €5 or go Premium for €19/month — pause or cancel whenever you
                want, no lock-in.
              </>
            }
          />
        </div>

        {/* Final CTA */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/stylist" variant="primary" ariaLabel="Start styling now">
            Start Styling
          </Button>
          <Button href="/pricing" variant="outline" ariaLabel="See pricing">
            See Pricing
          </Button>
          <Button onClick={goHowItWorks} variant="ghost" ariaLabel="See how it works">
            How It Works
          </Button>
        </div>
      </section>
    </main>
  );
}

