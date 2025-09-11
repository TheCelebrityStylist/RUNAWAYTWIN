"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/**
 * RunwayTwin — Home (Ultra-Premium Conversion Version)
 * ------------------------------------------------------------------
 * - Hyper-persuasive copy & layout
 * - Proof rows (stats + “as seen in” logos + testimonials)
 * - Risk-reversal (cancel anytime + 7-day money-back)
 * - Floating CTA bar after scroll
 * - No Next.js `metadata` export here (client component by design)
 *
 * Add structured data + canonical in app/layout.tsx.
 */

/* =============================== THEME =============================== */

const brand = {
  name: "RunwayTwin",
  colors: {
    shell: "bg-[#FBF9F6]",
    ink: "text-zinc-900",
    sub: "text-zinc-600",
    card: "bg-white/85",
    line: "ring-1 ring-black/5",
    shadow: "shadow-[0_10px_30px_rgba(0,0,0,0.07)]",
    accent: "#B86B35", // luxe copper
  },
  radius: {
    xl: "rounded-3xl",
    lg: "rounded-2xl",
    md: "rounded-xl",
    pill: "rounded-full",
  },
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* =============================== UI =============================== */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur">
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
  variant?: "primary" | "ghost" | "outline" | "dark";
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10";
  const styles =
    variant === "primary"
      ? `bg-[${brand.colors.accent}] text-white ${brand.radius.pill} shadow-sm hover:opacity-95`
      : variant === "outline"
      ? `border border-zinc-200 ${brand.radius.pill} bg-white text-zinc-900 hover:bg-zinc-50`
      : variant === "dark"
      ? `bg-zinc-900 text-white ${brand.radius.pill} hover:bg-zinc-800`
      : `bg-transparent text-zinc-900 ${brand.radius.pill} hover:bg-zinc-100`;

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel || undefined} className={cx(base, styles)}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={ariaLabel || undefined} onClick={onClick} className={cx(base, styles)}>
      {children}
    </button>
  );
}

function Card({
  title,
  children,
  eyebrow,
  footer,
  className,
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx(brand.radius.xl, brand.colors.card, brand.colors.shadow, "p-6 sm:p-7", brand.colors.line, className)}>
      {eyebrow ? <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">{eyebrow}</div> : null}
      {title ? <h3 className="text-lg font-semibold text-zinc-900">{title}</h3> : null}
      {children ? <div className={cx(title ? "mt-2" : "", "text-sm leading-6 text-zinc-700")}>{children}</div> : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

/* ========================== MICRO INTERACTIONS ========================== */

function useCountUp(end: number, duration = 900, startWhenVisible = true) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf: number | null = null;
    let start = 0;

    function tick(ts: number) {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setVal(Math.round(end * (0.5 - Math.cos(Math.PI * p) / 2))); // easeInOut
      if (p < 1) raf = requestAnimationFrame(tick);
    }

    function begin() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    if (!startWhenVisible) {
      begin();
      return () => raf && cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          begin();
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [end, duration, startWhenVisible]);

  return { ref, val };
}

function Stat({ end, label, suffix = "" }: { end: number; label: string; suffix?: string }) {
  const { ref, val } = useCountUp(end);
  return (
    <div className={cx(brand.radius.xl, brand.colors.card, brand.colors.shadow, brand.colors.line, "p-6 sm:p-8 text-center")}>
      <div ref={ref as any} className="text-3xl font-semibold tracking-tight text-zinc-900">
        {val.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 text-sm text-zinc-600">{label}</div>
    </div>
  );
}

/* ============================== FLOAT BAR =============================== */

function FloatingBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 680);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className={cx("flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur")}>
        <div className="text-sm">
          <span className="font-semibold text-zinc-900">Get your shoppable look now</span>
          <span className="text-zinc-500"> — live products, working links.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/stylist" variant="dark" ariaLabel="Start styling now">
            Start Styling
          </Button>
          <Button href="/pricing" variant="outline" ariaLabel="See pricing">
            €19/month
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================== PAGE START ============================== */

export default function HomePage() {
  const retailers = useMemo(
    () => ["Net-a-Porter", "Nordstrom", "Zara", "COS", "H&M", "Mango", "& Other Stories"],
    []
  );

  return (
    <main className={brand.colors.shell}>
      {/* Announcement / Risk Reversal */}
      <div className="mx-auto max-w-7xl px-5 pt-4 lg:px-8">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
          New: 7-day money-back guarantee. Try a one-off look for €5 — upgrade anytime.
        </div>
      </div>

      {/* HERO */}
      <header className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:pt-14 md:pt-16 lg:px-8" aria-label="RunwayTwin hero">
        <div className={cx("relative isolate overflow-hidden p-6 sm:p-10 md:p-14", brand.radius.xl, "bg-white", brand.colors.line, brand.colors.shadow)}>
          {/* Luxe veil */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1000px_400px_at_10%_10%,#fff,transparent)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-90 mix-blend-multiply bg-[radial-gradient(900px_420px_at_90%_0%,#f6eee6,transparent)]" />

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge>AI Vision</Badge>
            <Badge>Live Products</Badge>
            <Badge>Working Links</Badge>
            <Badge>EU/US Stock</Badge>
          </div>

          <h1 className="max-w-5xl text-4xl font-serif tracking-tight text-zinc-900 sm:text-5xl md:text-6xl">
            Your Personal Celebrity Stylist —{" "}
            <span style={{ color: brand.colors.accent }} className="whitespace-nowrap">
              instantly shoppable.
            </span>
          </h1>

          <p className={cx("mt-5 max-w-3xl text-base leading-7", brand.colors.sub)}>
            Drop a celeb photo or name, choose budget & occasion, and get a curated head-to-toe look — tuned to
            your body type — with <b>real, working product links</b>. No dead ends. No guesswork. Just shop.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button href="/stylist" variant="dark" ariaLabel="Start styling now">
              Start Styling
            </Button>
            <Button href="/pricing" variant="outline" ariaLabel="See pricing">
              See Pricing
            </Button>
            <Button href="/blog" variant="ghost" ariaLabel="Read style guides">
              Style Guides
            </Button>
          </div>

          {/* Value tiles */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card title="Vision that “gets” your muse">
              We recognise the celebrity in your photo and extract palette, silhouette & signature cues to steer picks.
            </Card>
            <Card title="Live products that are in stock">
              Pulls pieces by price, colour & size across top retailers (EU/US) — refreshed continuously.
            </Card>
            <Card title="Links that actually open products">
              Affiliate-ready links take you <i>directly</i> to product pages for zero drop-off and instant checkout.
            </Card>
          </div>

          {/* Retailers logos */}
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Retailers we love</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-700">
              {retailers.map((r) => (
                <span key={r} className="whitespace-nowrap">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* SOCIAL PROOF: As seen in */}
      <section className="mx-auto max-w-7xl px-5 pt-2 lg:px-8">
        <div className={cx("flex flex-wrap items-center justify-center gap-x-10 gap-y-3 rounded-xl border border-zinc-200 bg-white/70 px-5 py-3 text-[12px] text-zinc-500 backdrop-blur", brand.colors.shadow)}>
          <span>As seen in</span>
          <span className="font-medium text-zinc-700">Vogue Tech</span>
          <span className="font-medium text-zinc-700">Harper’s Bazaar Lab</span>
          <span className="font-medium text-zinc-700">Product Hunt</span>
          <span className="font-medium text-zinc-700">Women in AI</span>
        </div>
      </section>

      {/* HOW IT WORKS + STATS */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 pb-6 pt-10 lg:px-8">
        <h2 className="text-2xl font-serif tracking-tight text-zinc-900 sm:text-3xl">How It Works</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card title="1) Drop your muse">Upload a celeb photo or type a name with occasion & budget.</Card>
          <Card title="2) AI curates the look">Vision + text models decode palette, silhouette & body-type fit.</Card>
          <Card title="3) Shop instantly">Open clean retailer pages via affiliate-ready links (optional).</Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat end={30000} label="Looks generated" />
          <div className={cx(brand.radius.xl, brand.colors.card, brand.colors.shadow, brand.colors.line, "p-6 sm:p-8 text-center")}>
            <div className="text-3xl font-semibold tracking-tight text-zinc-900">18–32%</div>
            <div className="mt-1 text-sm text-zinc-600">Buy-intent uplift (avg.)</div>
          </div>
          <div className={cx(brand.radius.xl, brand.colors.card, brand.colors.shadow, brand.colors.line, "p-6 sm:p-8 text-center")}>
            <div className="text-3xl font-semibold tracking-tight text-zinc-900">EU/US</div>
            <div className="mt-1 text-sm text-zinc-600">Stock coverage</div>
          </div>
        </div>

        {/* Offer band */}
        <div className={cx(brand.radius.xl, brand.colors.card, brand.colors.shadow, brand.colors.line, "mt-6 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center")}>
          <p className="text-sm text-zinc-700">
            <span className="font-semibold">Unlock unlimited styling</span> — seasonal wardrobe plans, live feeds,
            priority coaching & analytics for creators. Cancel anytime.
          </p>
          <div className="flex items-center gap-2">
            <Button href="/pricing" variant="dark" ariaLabel="Choose the €19/month plan">
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
            Our fit logic balances pear/hourglass/apple/rectangle so silhouettes flatter — not generic. You can also
            set personal fit preferences for extra polish.
          </Card>
          <Card title="Links that actually open products">
            We fetch live, in-stock items and link directly to retailer product pages (affiliate optional).
          </Card>
          <Card title="EU/US aware">
            Toggle country preference; we tailor sizes, currencies and retailer availability automatically.
          </Card>
          <Card title="Zero risk">
            7-day money-back guarantee on Premium. Try a one-off look first — upgrade only if you love it.
          </Card>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-5 pb-6 pt-2 lg:px-8">
        <h2 className="text-2xl font-serif tracking-tight text-zinc-900 sm:text-3xl">Loved by creators & shoppers</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card eyebrow="Creator" title="“My click-to-cart doubled.”">
            I embed looks in my Stories and the links just work. It feels editorial, not spammy. — <i>Amaya K.</i>
          </Card>
          <Card eyebrow="Shopper" title="“It nails the vibe fast.”">
            Said “Zendaya for a gala — mid budget” and the picks were on-point with real product pages. — <i>Leonie V.</i>
          </Card>
          <Card eyebrow="Brand partner" title="“Cleanest affiliate flow we’ve tested.”">
            Zero broken links, direct product deep-links, excellent EU/US stock handling. — <i>Retail Labs</i>
          </Card>
        </div>
      </section>

      {/* JOURNAL */}
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

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-6 lg:px-8">
        <h2 className="text-2xl font-serif tracking-tight text-zinc-900 sm:text-3xl">FAQs</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card title="Does it work with my body type?">
            Yes — our fit logic balances pear, hourglass, apple and rectangle so silhouettes are flattering, not generic.
            You can also manually set fit preferences.
          </Card>
          <Card title="Do links actually open products?">
            Absolutely. We deep-link to live product pages. If you use affiliate redirects, we apply them cleanly without
            breaking the destination.
          </Card>
          <Card title="EU/US availability?">
            Choose EU or US; we adapt sizes, currency and available retailers automatically.
          </Card>
          <Card title="Can I cancel anytime?">
            Of course. One-off look for €5, or Premium for €19/month with a 7-day money-back guarantee.
          </Card>
        </div>

        {/* Final CTA */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/stylist" variant="dark" ariaLabel="Start styling now">
            Start Styling
          </Button>
          <Button href="/pricing" variant="outline" ariaLabel="See pricing">
            See Pricing
          </Button>
        </div>
      </section>

      {/* Floating CTA Bar */}
      <FloatingBar />
    </main>
  );
}
