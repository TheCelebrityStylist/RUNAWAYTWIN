"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-16 grid gap-8 sm:grid-cols-2">
        <div className="card overflow-hidden">
          {/* Use a clean editorial image. If you don’t have one yet, duplicate hero.jpg for now. */}
          <img src="/lookbook.jpg" alt="Editorial look" className="w-full h-full object-cover" />
        </div>
        <div className="self-center">
          <h1 className="font-display text-3xl tracking-tight">About RunwayTwin</h1>
          <p className="mt-3 text-sm text-rt-charcoal/85">
            We blend editorial taste with modern AI. Describe your muse — “Zendaya for an evening gala, mid budget” —
            and we deliver a flattering head-to-toe look with live shop links aligned to your price point.
          </p>
          <p className="mt-3 text-sm text-rt-charcoal/85">
            For creators and entrepreneurs, RunwayTwin is affiliate-ready out of the box. Connect your redirect prefix
            and monetize every click.
          </p>
          <div className="mt-6 flex gap-3">
            <a className="btn" href="/stylist">Try the Stylist</a>
            <a className="btn-outline" href="/upgrade">See Pricing</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
