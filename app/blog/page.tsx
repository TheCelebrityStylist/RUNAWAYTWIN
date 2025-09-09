"use client";
import type { Metadata } from "next";
import Header from "@/components/Header"; import Footer from "@/components/Footer";
import { JsonLd } from "@/components/Seo";

export const metadata: Metadata = {
  title: "RunwayTwin Journal – Celebrity Style Guides",
  description: "Editorial guides on Zendaya, Rihanna, Jennifer Lawrence and more — with shoppable links.",
  alternates: { canonical: "https://runwaytwin.vercel.app/blog" },
  openGraph: {
    title: "RunwayTwin Journal",
    description: "Celebrity style guides with live shoppable links.",
    url: "https://runwaytwin.vercel.app/blog",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

const posts = [
  { slug: "dress-like-zendaya", title: "Dress Like Zendaya: Red-Carpet to Real Life", excerpt: "Her formula, colors, and shoppable pieces under €100." },
  { slug: "rihanna-streetwear-guide", title: "Rihanna Streetwear: The Exact Vibe (and Where to Buy)", excerpt: "Oversized outerwear, crop+wide leg, bold accessories." },
  { slug: "jennifer-lawrence-minimalism", title: "Jennifer Lawrence Minimalism: Workwear Capsule", excerpt: "Neutral palette, sleek tailoring, pointed shoes." }
];

export default function Blog() {
  const json = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "RunwayTwin Journal",
    url: "https://runwaytwin.vercel.app/blog",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `https://runwaytwin.vercel.app/blog/${p.slug}`,
    })),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://runwaytwin.vercel.app/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };

  return (
    <main className="min-h-screen">
      <Header />
      <JsonLd id="blog-jsonld" data={json} />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="font-display text-3xl tracking-tight">RunwayTwin Journal</h1>
        <p className="mt-2 text-sm text-rt-charcoal/85">Celebrity style guides with shoppable links.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {posts.map((p) => (
            <a key={p.slug} href={`/blog/${p.slug}`} className="card p-5 hover:shadow-soft">
              <div className="text-lg font-display">{p.title}</div>
              <p className="text-sm text-rt-charcoal/80 mt-2">{p.excerpt}</p>
              <div className="mt-3 text-xs text-rt-charcoal/60">Read more →</div>
            </a>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
