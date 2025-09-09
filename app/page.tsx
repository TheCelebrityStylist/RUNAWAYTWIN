"use client";

import Header from "@/components/Header";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* HERO — clean, cinematic banner (no busy overlay) */}
      <section className="relative">
        <div
          className="absolute inset-0 -z-10"
          style={{
            // Please upload /public/hero.jpg (the clean desktop image I generated for you)
            background: "url('/hero.jpg') center/cover no-repeat",
          }}
        />
        {/* Subtle readable gradient at the bottom only (keeps image clean) */}
        <div className="absolute inset-0 -z-0 bg-gradient-to-b from-transparent via-transparent to-rt-ivory/90" />

        <div className="mx-auto max-w-7xl px-6 pt-28 pb-24">
          <h1 className="font-display text-4xl sm:text-6xl leading-tight tracking-tight">
            Your Personal Celebrity Stylist — <span className="text-rt-gold">instantly shoppable</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-rt-charcoal/85">
            Upload a celebrity photo or name, choose your budget, and get a curated outfit with working links.
            Affiliate-ready from day one.
          </p>
          <div className="mt-6 flex gap-3">
            <a className="btn" href="/stylist">Start Styling</a>
            <a className="btn-outline" href="#features">See Features</a>
          </div>
        </div>
      </section>

      {/* FEATURES PREVIEW */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-14 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xl font-display tracking-tight">Real AI Vision</div>
          <p className="mt-2 text-sm text-rt-charcoal/80">
            Detect the celeb from your photo, extract palette & silhouette.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-xl font-display tracking-tight">Live Products</div>
          <p className="mt-2 text-sm text-rt-charcoal/80">
            In-stock pieces by price, color, and size from major retailers.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-xl font-display tracking-tight">Instant Shop Links</div>
          <p className="mt-2 text-sm text-rt-charcoal/80">
            Clean, working links via your affiliate redirect so every click can monetize.
          </p>
        </div>
      </section>

      {/* Pricing teaser (we’ll replace with full pricing in Step B) */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="card p-6 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm text-rt-charcoal/80">Premium Stylist</div>
            <div className="mt-1 text-3xl font-semibold">€19<span className="text-lg">/month</span></div>
            <p className="mt-2 text-sm text-rt-charcoal/80">Unlimited stylings • Priority looks • Wardrobe plans</p>
            <a className="btn mt-4 inline-block" href="/upgrade">Go Premium</a>
          </div>
          <div>
            <div className="text-sm text-rt-charcoal/80">One-Off Look</div>
            <div className="mt-1 text-3xl font-semibold">€5</div>
            <p className="mt-2 text-sm text-rt-charcoal/80">Single session • Working product links • No subscription</p>
            <a className="btn-outline mt-4 inline-block" href="/stylist">Try One-Off</a>
          </div>
        </div>
      </section>
    </main>
  );
}

