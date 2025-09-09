// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { JsonLd } from "@/components/Seo";

export const metadata: Metadata = {
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
    url: "https://runwaytwin.com",
    siteName: "RunwayTwin",
    images: [
      {
        url: "/hero.jpg",
        width: 1200,
        height: 630,
        alt: "RunwayTwin AI Celebrity Stylist"
      }
    ],
    locale: "en_US",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preload hero image for faster LCP */}
        <link rel="preload" as="image" href="/hero.jpg" />
      </head>
      <body className="min-h-screen bg-rt-ivory text-rt-black font-body antialiased">
        {/* Global SEO JSON-LD */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "RunwayTwin",
            url: "https://runwaytwin.com",
            description:
              "AI celebrity stylist for instantly shoppable outfits inspired by your favorite stars.",
            publisher: {
              "@type": "Organization",
              name: "RunwayTwin"
            }
          }}
        />
        {children}
      </body>
    </html>
  );
}

