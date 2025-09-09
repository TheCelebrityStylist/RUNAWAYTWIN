// app/about/page.tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About – RunwayTwin",
  description:
    "RunwayTwin blends editorial taste with modern AI to turn celebrity inspiration into shoppable, flattering looks. Built for creators and shoppers.",
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
        {/* Brand image / vibe */}
        <div className="card overflow-hidden">
          <img
            src="/hero.jpg"
            alt="RunwayTwin aesthetic"
            className="w-full h-full object-cover opacity-90"
            loading="eager"
          />
        </div>

        {/* Copy */}
        <article className="prose">
          <h1>About RunwayTwin</h1>
          <p>
            RunwayTwin is a premium AI stylist that translates your favorite
            celebrity’s vibe into everyday, shoppable outfits — tuned to your
            body type, budget, and occasion.
          </p>

          <h2>What makes us different</h2>
          <ul>
            <li>Vision model to detect celeb + extract palette and silhouette</li>
            <li>Live product feeds filtered by price, size, color, country</li>
            <li>Body–type balancing rules for flattering proportions</li>
            <li>Clean, affiliate–ready shop links and proper disclosure</li>
          </ul>

          <h2>For creators & entrepreneurs</h2>
          <p>
            Connect your affiliate program, share looks, and monetize every
            click. We keep links clean and compliant so you can focus on style.
          </p>

          <p className="mt-6">
            <a href="/stylist" className="btn">Try the Stylist</a>
            <a href="/pricing" className="btn-outline ml-3">See Pricing</a>
          </p>
        </article>
      </section>

      <Footer />
    </main>
  );
}
