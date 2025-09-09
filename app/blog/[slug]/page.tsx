// app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Example blog content data (replace with CMS / MDX later)
const content: Record<
  string,
  { title: string; description: string; body: string; image: string }
> = {
  "zendaya-evening-glam": {
    title: "Zendaya Evening Glam",
    description:
      "Step into Zendaya’s red carpet look — curated outfit breakdown with instantly shoppable links.",
    body: "Zendaya’s red carpet outfits are defined by sleek silhouettes, metallic accents, and bold confidence. Our AI Stylist decoded this look into affordable pieces: silk gowns, statement heels, and gold-tone jewelry — all instantly shoppable with live retailer links.",
    image: "/blog/zendaya.jpg",
  },
  "rihanna-street-luxe": {
    title: "Rihanna Street Luxe",
    description:
      "Decode Rihanna’s streetwear-meets-luxury aesthetic with shoppable AI-curated links.",
    body: "Rihanna’s signature style blends oversized silhouettes, edgy accessories, and luxury fabrics. To recreate this look, try oversized bomber jackets, baggy jeans, and sharp heels — all linked below for instant shopping.",
    image: "/blog/rihanna.jpg",
  },
  "jlaw-off-duty": {
    title: "Jennifer Lawrence Off-Duty",
    description:
      "Jennifer Lawrence’s casual chic decoded into everyday wearable pieces.",
    body: "Jennifer’s off-duty style focuses on comfort-driven chic: wide-leg trousers, relaxed knitwear, and sleek sneakers. With our AI-curated picks, you can instantly shop her effortless looks.",
    image: "/blog/jlaw.jpg",
  },
};

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = content[params.slug];
  if (!post) {
    return {
      title: "RunwayTwin Journal",
      description: "Celebrity style guides with instantly shoppable links.",
    };
  }
  return {
    title: `${post.title} – RunwayTwin Journal`,
    description: post.description,
    alternates: {
      canonical: `https://runwaytwin.vercel.app/blog/${params.slug}`,
    },
    openGraph: {
      title: `${post.title} – RunwayTwin Journal`,
      description: post.description,
      url: `https://runwaytwin.vercel.app/blog/${params.slug}`,
      images: [{ url: post.image, width: 1200, height: 630 }],
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = content[params.slug];

  if (!post) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Post not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      <article className="mx-auto max-w-3xl px-6 py-14">
        <img
          src={post.image}
          alt={post.title}
          className="w-full rounded-xl mb-6"
          loading="lazy"
        />
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <p className="text-lg text-gray-600 mb-8">{post.description}</p>
        <div className="prose prose-lg max-w-none">{post.body}</div>
      </article>

      <Footer />
    </main>
  );
}
