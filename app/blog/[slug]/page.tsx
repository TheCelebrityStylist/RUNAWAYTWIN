"use client";
import type { Metadata } from "next";
import Header from "@/components/Header"; import Footer from "@/components/Footer";
import { JsonLd } from "@/components/Seo";

const content: Record<string, { title: string; body: string; date: string }> = {
  "dress-like-zendaya": {
    title: "Dress Like Zendaya: Red-Carpet to Real Life",
    body:
      "Zendaya blends strong shoulders, sculptural satin, and tailored wide-legs. Start with a structured top, add wide-leg trousers, and finish with sleek heels. Try COS for tailoring, Zara for statement satin, and Net-A-Porter for premium edits.",
    date: "2025-01-10",
  },
  "rihanna-streetwear-guide": {
    title: "Rihanna Streetwear: The Exact Vibe (and Where to Buy)",
    body:
      "Think oversized outerwear, crop + wide leg, layered chains. Mix leather with denim. Mango & COS for outerwear; H&M for denim; finish with bold accessories.",
    date: "2025-01-15",
  },
  "jennifer-lawrence-minimalism": {
    title: "Jennifer Lawrence Minimalism: Workwear Capsule",
    body:
      "Neutral palette (black, ivory, taupe), crisp shirts, wide-leg trousers, sharp blazers. Pointed flats or low pumps to elongate the line.",
    date: "2025-01-20",
  },
};

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = content[params.slug];
  if (!post) return { title: "RunwayTwin Journal" };
  const url = `https://runwaytwin.vercel.app/blog/${params.slug}`;
  return {
    title: `${post.title} – RunwayTwin`,
    description: post.body.slice(0, 150),
    alternates: { canonical: url },
    openGraph: {
      title: `${post.title} – RunwayTwin`,
      description: post.body.slice(0, 150),
      url,
      images: [{ url: "/og.jpg", width: 1200, height: 630 }],
      type: "article",
    },
  };
}

export default function Post({ params }: { params: { slug: string } }) {
  const post = content[params.slug];
  if (!post) {
    return (
      <main className="min-h-screen"><Header /><section className="mx-auto max-w-3xl px-6 py-16">Not found.</section><Footer /></main>
    );
  }

  const json = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "RunwayTwin" },
    publisher: { "@type": "Organization", name: "RunwayTwin", logo: { "@type": "ImageObject", url: "https://runwaytwin.vercel.app/og.jpg" } },
    image: "https://runwaytwin.vercel.app/og.jpg",
    mainEntityOfPage: `https://runwaytwin.vercel.app/blog/${params.slug}`,
  };

  return (
    <main className="min-h-screen">
      <Header />
      <JsonLd id={`post-${params.slug}-jsonld`} data={json} />
      <article className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral">
        <h1>{post.title}</h1>
        <p>{post.body}</p>
        <p><a href="/stylist">Get a look inspired by this muse →</a></p>
      </article>
      <Footer />
    </main>
  );
}
