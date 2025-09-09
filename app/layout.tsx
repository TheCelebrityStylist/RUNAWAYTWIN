// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://runwaytwin.vercel.app"),
  title: "RunwayTwin — Your Personal Celebrity Stylist",
  description:
    "AI celebrity stylist that curates shoppable outfits inspired by your favorite stars. Upload a celeb photo or name, set your budget, and shop instantly.",
  keywords: [
    "celebrity stylist",
    "AI fashion",
    "shoppable outfits",
    "celebrity inspired fashion",
    "RunwayTwin"
  ],
  openGraph: {
    title: "RunwayTwin — Your Personal Celebrity Stylist",
    description:
      "Upload a celebrity photo or name, set your budget, and shop curated outfits with working affiliate links.",
    url: "https://runwaytwin.vercel.app",
    siteName: "RunwayTwin",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "RunwayTwin AI" }],
    locale: "en_US",
    type: "website"
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://runwaytwin.vercel.app" }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Global JSON-LD (safe via next/script)
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RunwayTwin",
    url: "https://runwaytwin.vercel.app",
    description:
      "AI celebrity stylist for instantly shoppable outfits inspired by your favorite stars.",
    publisher: { "@type": "Organization", name: "RunwayTwin" }
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RunwayTwin",
    url: "https://runwaytwin.vercel.app",
    logo: "https://runwaytwin.vercel.app/og.jpg",
    sameAs: [
      "https://instagram.com/runwaytwin",
      "https://www.tiktok.com/@runwaytwin"
    ]
  };

  return (
    <html lang="en">
      <head>
        {/* Performance: warm the LCP hero image */}
        <link rel="preload" as="image" href="/hero.jpg" />
      </head>
      <body className="min-h-screen bg-rt-ivory text-rt-black font-body antialiased">
        {/* Global SEO JSON-LD */}
        <Script id="jsonld-website" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(websiteJsonLd)}
        </Script>
        <Script id="jsonld-organization" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(orgJsonLd)}
        </Script>

        {children}
      </body>
    </html>
  );
}

