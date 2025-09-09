"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs text-white backdrop-blur">
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Clean hero image you uploaded as /public/hero.jpg */}
        <div
          className="absolute inset-0 -z-20"
          style={{ background: "url('/hero.jpg') center/cover no-repeat" }}
        />
        {/* Gentle bottom fade for legibility */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-rt-ivory" />

        <div className="mx-auto max-w-7xl px-6 pt-20 pb-28">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl sm:text-6xl leading-tight tracking-tight text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.25)]">
              Your Personal Celebrity Stylist — <span className="text-rt-gold">instantly shoppable</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
              Upload a celebrity photo or name, set your budget & occasion, and shop a curated outfit with working links.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a className="btn" href="/stylist">Start Styling</a>
              <a className="btn-outline border-white text-white hover:text-rt-black hover:border-rt-black" href="#pricing">
                See Pricing
              </a>
            </div>
          </div>

          {/* Floating badges (subtle motion) */}
          <div className="pointer-events-none mt-10 flex flex-wrap gap-2">
            <Badge>Real AI Vision</Badge>
            <Badge>Live Products</Badge>
            <Badge>Affiliate-Ready Links</Badge>
            <Badge>Zendaya • Rihanna • Blake • JLaw</Badge>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section id="features" className="mx-auto max-w-7xl px-6 -mt-12 pb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-xl font-display">AI Vision</div>
            <p className="mt-2 text-sm text-rt-charcoal/80">
              Detects the celeb from your photo; extracts palette, silhouette & signatures.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-xl font-display">Live Products</div>
            <p className="mt-2 text-sm text-rt-charcoal/80">
              Pulls in-stock items by price, color & size from major retailers.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-xl font-display">Working Links</div>
            <p className="mt-2 text-sm text-rt-charcoal/80">
              Clean shop links wrapped through your affiliate redirect to monetize clicks.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING (teaser) */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="text-2xl font-display tracking-tight">Your Style, Your Rules</h2>
        <p className="mt-2 text-sm text-rt-charcoal/80">Choose your path to style</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <div className="text-sm text-rt-charcoal/80">Premium Stylist</div>
            <div className="mt-1 text-3xl font-semibold">€19<span className="text-lg">/month</span></div>
            <ul className="mt-4 space-y-2 text-sm text-rt-charcoal/80">
              <li>Unlimited stylings</li>
              <li>Priority looks & wardrobe plans</li>
              <li>Live feeds + affiliate analytics</li>
            </ul>
            <a className="btn mt-5 inline-block" href="/upgrade">Go Premium</a>
          </div>
          <div className="card p-6">
            <div className="text-sm text-rt-charcoal/80">One-Off Look</div>
            <div className="mt-1 text-3xl font-semibold">€5</div>
            <ul className="mt-4 space-y-2 text-sm text-rt-charcoal/80">
              <li>Single styling session</li>
              <li>Working product links</li>
              <li>No subscription</li>
            </ul>
            <a className="btn-outline mt-5 inline-block" href="/stylist">Try One-Off</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
