"use client";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/Seo";

export const metadata: Metadata = {
  title: "About – RunwayTwin",
  description:
    "RunwayTwin blends editorial taste with modern AI to turn celebrity inspiration into shoppable, flattering looks.",
  alternates: { canonical: "https://runwaytwin.vercel.app/about" },
  openGraph: {
    title: "About – RunwayTwin",
    description:
      "AI celebrity stylist with live product links and affiliate-ready redirects.",
    url: "https://runwaytwin.vercel.app/about",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  const aboutJson = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About RunwayTwin",
    url: "https://runwaytwin.vercel.app/about",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://runwaytwin.vercel.app" },
        { "@type": "ListItem", position: 2, name: "About", item: "https://runwaytwin.vercel.app/about" },
      ],
    },
  };

  return (
    <main className="min-h-screen">
      <Header />
      <JsonLd id="about-jsonld" data={aboutJson} />

      {/* Intro */}
      <section className="mx-auto max-w-7xl px-6 py-16 grid gap-10 sm:grid-cols-2">
        <div className="card overflow-hidden">
          <img src="/lookbook.jpg" alt="Editorial fashion look" className="w-full h-full object-cover" />
        </div>
        <div className="self-center">
          <h1 className="font-display text-3xl tracking-tight">About RunwayTwin</h1>
          <p className="mt-3 text-sm text-rt-charcoal/85">
            RunwayTwin is your **AI celebrity stylist**. Drop a muse (e.g., Zendaya for a gala) and a budget, and we
            return a complete look that flatters your body and fits the occasion — with **working shop links**.
          </p>
          <p className="mt-3 text-sm text-rt-charcoal/85">
            We combine computer vision and natural language understanding to extract palette, silhouette and signature
            pieces, then search live retailer inventory by price, size and color.
          </p>
          <div className="mt-6 flex gap-3">
            <a className="btn" href="/stylist">Try the Stylist</a>
            <a className="btn-outline" href="/pricing">See Pricing</a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="text-2xl font-display tracking-tight">How It Works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <b>1) Drop your muse</b>
            <p className="text-sm text-rt-charcoal/80 mt-1">Upload a celeb photo or type a name + occasion + budget.</p>
          </div>
          <div className="card p-5">
            <b>2) AI curates the look</b>
            <p className="text-sm text-rt-charcoal/80 mt-1">We balance body type, palette and celeb signatures.</p>
          </div>
          <div className="card p-5">
            <b>3) Shop instantly</b>
            <p className="text-sm text-rt-charcoal/80 mt-1">Open clean retailer pages via affiliate-ready links.</p>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="card p-6 grid gap-6 sm:grid-cols-3">
          <div><b>Data privacy</b><p className="text-sm text-rt-charcoal/80 mt-1">User-controlled saves; secure processing.</p></div>
          <div><b>Retailer friendly</b><p className="text-sm text-rt-charcoal/80 mt-1">Clean click-outs; no scraping private pages.</p></div>
          <div><b>Affiliate ready</b><p className="text-sm text-rt-charcoal/80 mt-1">Works with Skimlinks, Awin, Impact & more.</p></div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
