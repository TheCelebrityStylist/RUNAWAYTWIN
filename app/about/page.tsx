// app/about/page.tsx
// app/about/page.tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About – RunwayTwin",
  description:
    "RunwayTwin blends editorial taste with modern AI to turn celebrity inspiration into shoppable, flattering looks. Made for creators and shoppers.",
  alternates: { canonical: "https://runwaytwin.vercel.app/about" },
  openGraph: {
    title: "About – RunwayTwin",
    description:
      "RunwayTwin blends editorial taste with modern AI to turn celebrity inspiration into shoppable, flattering looks.",
    url: "https://runwaytwin.vercel.app/about",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-14 grid gap-10 lg:grid-cols-2">
        {/* Brand imagery */}
        <div className="card overflow-hidden">
          <img
            src="/hero.jpg"
            alt="RunwayTwin aesthetic"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        {/* Story + Differentiators */}
        <article className="prose">
          <h1>About RunwayTwin</h1>
          <p>
            RunwayTwin is a premium AI stylist that translates your favorite
            celebrity’s vibe into everyday, shoppable outfits — tuned to your
            body type, budget, and occasion. We merge editorial judgment with
            modern AI so the results feel as thoughtful as a human stylist.
          </p>

          <h2>How it works</h2>
          <ul>
            <li>
              <strong>Vision</strong> detects the celebrity from your photo and
              extracts palette, silhouette and signature details.
            </li>
            <li>
              <strong>Live feeds</strong> pull in-stock pieces by price, color,
              size and country across top retailers.
            </li>
            <li>
              <strong>Fit logic</strong> balances body type proportions
              (pear/hourglass/apple/rectangle) for flattering outfits.
            </li>
            <li>
              <strong>Clean links</strong> open retailer product pages with
              affiliate-ready redirects when enabled.
            </li>
          </ul>

          <h2>For creators & entrepreneurs</h2>
          <p>
            Build style guides, share looks, and monetize every click. We keep
            links clean and compliant so you can focus on content and community.
          </p>

          <p className="mt-6">
            <a href="/stylist" className="btn">Try the Stylist</a>
            <a href="/pricing" className="btn-outline ml-3">See Pricing</a>
          </p>
        </article>
      </section>

      {/* Trust signals */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="card p-6 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-lg font-semibold">Affiliate-ready</div>
            <p className="text-sm text-zinc-600">
              Clean redirects + disclosure helpers for partner programs.
            </p>
          </div>
          <div>
            <div className="text-lg font-semibold">Privacy-respectful</div>
            <p className="text-sm text-zinc-600">
              Only the data needed to deliver styling and working links.
            </p>
          </div>
          <div>
            <div className="text-lg font-semibold">Fast by design</div>
            <p className="text-sm text-zinc-600">
              Edge-first Next.js app with optimized images and caching.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
