"use client";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-rt-black text-white font-semibold">RT</div>
          <div>
            <div className="text-lg font-display tracking-tight">RunwayTwin</div>
            <div className="text-xs text-rt-charcoal/70">Be Their Runway Twin ✨</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <a className="btn-outline" href="/stylist">Try the Stylist</a>
          <a className="btn" href="/upgrade">Upgrade</a>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
            Your Personal Celebrity Stylist — instantly shoppable.
          </h1>
          <p className="mt-3 text-rt-charcoal/80 max-w-2xl">
            Upload a celebrity photo or name, choose your budget, and get a curated outfit with working links.
          </p>
          <div className="mt-6 flex gap-3">
            <a className="btn" href="/stylist">Start Styling</a>
            <a className="btn-outline" href="#pricing">See Pricing</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="section-title">Real AI Vision</div>
          <p className="mt-2 text-sm text-rt-charcoal/80">Detect the celeb from your photo, extract palette & silhouette.</p>
        </div>
        <div className="card p-5">
          <div className="section-title">Live Products</div>
          <p className="mt-2 text-sm text-rt-charcoal/80">Pulls in-stock pieces by price, color, and size from major retailers.</p>
        </div>
        <div className="card p-5">
          <div className="section-title">Instant Shop Links</div>
          <p className="mt-2 text-sm text-rt-charcoal/80">Affiliate-ready links so you can monetize every click.</p>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <div className="text-sm text-rt-charcoal/80">Premium Stylist</div>
            <div className="mt-2 text-3xl font-semibold">€19<span className="text-lg">/month</span></div>
            <ul className="mt-4 space-y-2 text-sm text-rt-charcoal/80">
              <li>Unlimited stylings</li>
              <li>Priority looks</li>
              <li>Seasonal wardrobe plans</li>
            </ul>
            <a className="btn mt-5 inline-block" href="/upgrade">Go Premium</a>
          </div>
          <div className="card p-6">
            <div className="text-sm text-rt-charcoal/80">One-off Look</div>
            <div className="mt-2 text-3xl font-semibold">€5</div>
            <ul className="mt-4 space-y-2 text-sm text-rt-charcoal/80">
              <li>Single styling session</li>
              <li>Working product links</li>
              <li>No subscription</li>
            </ul>
            <a className="btn mt-5 inline-block" href="/stylist">Try One-Off</a>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-12 text-xs text-rt-charcoal/70">
        © {new Date().getFullYear()} RunwayTwin — Celebrity Stylist AI
      </footer>
    </main>
  );
}

