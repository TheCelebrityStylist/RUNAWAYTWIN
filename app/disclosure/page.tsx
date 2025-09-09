import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure – RunwayTwin",
  description: "Some outbound links are affiliate links; we may earn a commission at no extra cost to you.",
  alternates: { canonical: "https://runwaytwin.vercel.app/disclosure" },
};

export default function Disclosure() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral">
        <h1>Affiliate Disclosure</h1>
        <p>
          RunwayTwin may include affiliate links to retailers and affiliate networks. If you click a link and make a purchase,
          we may receive a commission at no additional cost to you. This helps support the service and does not influence our
          styling suggestions.
        </p>
        <p>
          We aim to keep links clean and clearly labeled. If you have questions, contact{" "}
          <a href="mailto:hello@runwaytwin.com">hello@runwaytwin.com</a>.
        </p>
      </section>
      <Footer />
    </main>
  );
}
