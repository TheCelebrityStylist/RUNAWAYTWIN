"use client";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/Seo";

export const metadata: Metadata = {
  title: "Pricing – RunwayTwin",
  description:
    "Simple plans for AI celebrity styling. Unlimited stylings for €19/month or a one-off curated look for €5.",
  alternates: { canonical: "https://runwaytwin.vercel.app/pricing" },
  openGraph: {
    title: "Pricing – RunwayTwin",
    description:
      "Unlimited AI stylings (€19/month) or a one-off curated look (€5). Affiliate-ready links included.",
    url: "https://runwaytwin.vercel.app/pricing",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

export default function PricingPage() {
  const json = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "RunwayTwin Styling",
    description:
      "AI celebrity styling with live product links and affiliate-ready redirects.",
    areaServed: "Worldwide",
    offers: [
      {
        "@type": "Offer",
        name: "Premium Stylist",
        price: "19",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: "https://runwaytwin.vercel.app/upgrade",
      },
      {
        "@type": "Offer",
        name: "One-Off Look",
        price: "5",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: "https://runwaytwin.vercel.app/stylist",
      },
    ],
  };

  return (
    <main className="min-h-screen">
      <Header />
      <JsonLd id="pricing-jsonld" data={json} />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="font-display text-4xl tracking-tight">Pricing</h1>
        <p className="mt-2 text-sm text-rt-charcoal/85">
          Simple plans. Upgrade any time. Affiliate-ready out of the box.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="card p-6">
            <div className="text-sm text-rt-charcoal/80">Premium Stylist</div>
            <div className="mt-1 text-4xl font-semibold">
              €19<span className="text-lg">/month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-rt-charcoal/85">
              <li>Unlimited stylings</li>
              <li>Priority looks & wardrobe plans</li>
              <li>Live feeds + affiliate analytics</li>
              <li>Email support</li>
            </ul>
            <a className="btn mt-6 inline-block" href="/upgrade">
              Go Premium
            </a>
          </div>

          <div className="card p-6">
            <div className="text-sm text-rt-charcoal/80">One-Off Look</div>
            <div className="mt-1 text-4xl font-semibold">€5</div>
            <ul className="mt-4 space-y-2 text-sm text-rt-charcoal/85">
              <li>Single styling session</li>
              <li>Working product links</li>
              <li>No subscription</li>
            </ul>
            <a className="btn-outline mt-6 inline-block" href="/stylist">
              Try One-Off
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <b>Secure payments</b>
            <p className="text-sm text-rt-charcoal/80 mt-1">Handled by Stripe.</p>
          </div>
          <div className="card p-5">
            <b>Cancel anytime</b>
            <p className="text-sm text-rt-charcoal/80 mt-1">No lock-in period.</p>
          </div>
          <div className="card p-5">
            <b>Affiliate-ready</b>
            <p className="text-sm text-rt-charcoal/80 mt-1">
              Connect your redirect to monetize.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
