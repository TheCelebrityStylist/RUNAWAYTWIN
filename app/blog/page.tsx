// app/blog/page.tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "RunwayTwin Journal – Celebrity Style Guides",
  description:
    "Editorial guides on Zendaya, Rihanna, Jennifer Lawrence and more — with instantly shoppable links. Celebrity style decoded, simplified, and made yours.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog" },
  openGraph: {
    title: "RunwayTwin Journal – Celebrity Style Guides",
    description:
      "Editorial guides on Zendaya, Rihanna, Jennifer Lawrence and more — with instantly shoppable links.",
    url: "https://runwaytwin.vercel.app/blog",
    images: [{ url: "/og-blog.jpg", width: 1200, height: 630 }],
  },
};

export default function BlogPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h1 className="text-4xl font-bold mb-6">RunwayTwin Journal</h1>
        <p className="text-lg text-gray-600 mb-10">
          Editorial celebrity style breakdowns — curated with modern AI and
          instantly shoppable links. Learn how to translate the world’s most
          iconic looks into everyday outfits.
        </p>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Example Post Preview */}
          <article className="card hover:shadow-lg transition">
            <img
              src="/blog/zendaya.jpg"
              alt="Zendaya style guide"
              className="rounded-t-xl"
              loading="lazy"
            />
            <div className="p-5">
              <h2 className="text-xl font-semibold">Zendaya Evening Glam</h2>
              <p className="text-sm text-gray-600 mt-2">
                How to get Zendaya’s red carpet elegance on a mid-budget — full
                look with shoppable links.
              </p>
              <a href="/blog/zendaya-evening-glam" className="btn-link mt-4 inline-block">
                Read Guide →
              </a>
            </div>
          </article>

          <article className="card hover:shadow-lg transition">
            <img
              src="/blog/rihanna.jpg"
              alt="Rihanna style guide"
              className="rounded-t-xl"
              loading="lazy"
            />
            <div className="p-5">
              <h2 className="text-xl font-semibold">Rihanna Street Luxe</h2>
              <p className="text-sm text-gray-600 mt-2">
                Streetwear meets luxury — Rihanna’s signature vibe decoded and
                shoppable.
              </p>
              <a href="/blog/rihanna-street-luxe" className="btn-link mt-4 inline-block">
                Read Guide →
              </a>
            </div>
          </article>

          <article className="card hover:shadow-lg transition">
            <img
              src="/blog/jlaw.jpg"
              alt="Jennifer Lawrence style guide"
              className="rounded-t-xl"
              loading="lazy"
            />
            <div className="p-5">
              <h2 className="text-xl font-semibold">Jennifer Lawrence Off-Duty</h2>
              <p className="text-sm text-gray-600 mt-2">
                Casual chic from Jennifer Lawrence — outfits you can actually
                wear day-to-day.
              </p>
              <a href="/blog/jlaw-off-duty" className="btn-link mt-4 inline-block">
                Read Guide →
              </a>
            </div>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}

