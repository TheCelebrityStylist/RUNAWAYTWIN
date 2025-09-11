// app/blog/page.tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "RunwayTwin Journal – Celebrity Style Guides",
  description:
    "Editorial guides on Zendaya, Rihanna, Jennifer Lawrence and more — decoded and instantly shoppable.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog" },
  openGraph: {
    title: "RunwayTwin Journal – Celebrity Style Guides",
    description:
      "Editorial guides on Zendaya, Rihanna, Jennifer Lawrence and more — decoded and instantly shoppable.",
    url: "https://runwaytwin.vercel.app/blog",
    images: [{ url: "/og-blog.jpg", width: 1200, height: 630 }],
  },
};

const posts = [
  {
    slug: "zendaya-evening-glam",
    title: "Zendaya Evening Glam",
    excerpt:
      "Red-carpet elegance translated for real life — with shoppable links.",
    image: "/blog/zendaya.jpg",
  },
  {
    slug: "rihanna-street-luxe",
    title: "Rihanna Street Luxe",
    excerpt:
      "Oversized silhouettes + luxe details. The exact vibe, linked.",
    image: "/blog/rihanna.jpg",
  },
  {
    slug: "jlaw-off-duty",
    title: "Jennifer Lawrence Off-Duty",
    excerpt:
      "Casual chic you can wear every day — minimal, polished, effortless.",
    image: "/blog/jlaw.jpg",
  },
];

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="font-display text-3xl tracking-tight">
          RunwayTwin Journal
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Celebrity style decoded into wearable looks with live product links.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card hover:shadow-soft overflow-hidden">
              <img
                src={p.image}
                alt={p.title}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
              <div className="p-5">
                <div className="text-lg font-semibold">{p.title}</div>
                <p className="text-sm text-zinc-600 mt-2">{p.excerpt}</p>
                <div className="mt-3 text-xs text-zinc-500">Read guide →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}


