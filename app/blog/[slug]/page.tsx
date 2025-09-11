// app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// In-file content (replace with CMS/MDX later)
const content: Record<
  string,
  { title: string; description: string; body: string; image: string }
> = {
  "zendaya-evening-glam": {
    title: "Zendaya Evening Glam",
    description:
      "Step into Zendaya’s red carpet look — curated outfit breakdown with instantly shoppable links.",
    body:
      "<p>Zendaya’s red carpet looks lean on clean architectural lines and a refined sheen. To translate for real life, pair a sculpted-shoulder blazer with a liquid satin skirt or tailored wide-leg trouser. Finish with a pointed heel and minimal gold jewelry.</p>",
    image: "/blog/zendaya.jpg",
  },
  "rihanna-street-luxe": {
    title: "Rihanna Street Luxe",
    description:
      "Decode Rihanna’s streetwear-meets-luxury aesthetic with shoppable AI-curated links.",
    body:
      "<p>Go oversized up top — bomber or leather — and balance with crop + relaxed wide leg below. Add a sharp boot and a structured mini bag. Keep textures bold: leather, satin, coated denim.</p>",
    image: "/blog/rihanna.jpg",
  },
  "jlaw-off-duty": {
    title: "Jennifer Lawrence Off-Duty",
    description:
      "Jennifer Lawrence’s casual chic decoded into everyday wearable pieces.",
    body:
      "<p>Think crisp poplin, high-waist trousers, and sleek flats or low pumps. The palette stays neutral — ivory, taupe, black — and the fit is polished without feeling fussy.</p>",
    image: "/blog/jlaw.jpg",
  },
};

export function generateStaticParams() {
  return Object.keys(content).map((slug) => ({ slug }));
}

export function generateMetadata(
  { params }: { params: { slug: string } }
): Metadata {
  const post = content[params.slug];
  if (!post) {
    return {
      title: "RunwayTwin Journal",
      description: "Celebrity style guides with instantly shoppable links.",
    };
  }
  const url = `https://runwaytwin.vercel.app/blog/${params.slug}`;
  return {
    title: `${post.title} – RunwayTwin Journal`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${post.title} – RunwayTwin Journal`,
      description: post.description,
      url,
      images: [{ url: post.image, width: 1200, height: 630 }],
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = content[params.slug];

  if (!post) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-600">Post not found.</p>
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
          className="w-full h-64 object-cover rounded-xl"
          loading="lazy"
        />
        <h1 className="text-4xl font-bold mt-6">{post.title}</h1>
        <p className="text-lg text-zinc-600 mt-2">{post.description}</p>
        <div
          className="prose mt-6"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />
      </article>
      <Footer />
    </main>
  );
}
