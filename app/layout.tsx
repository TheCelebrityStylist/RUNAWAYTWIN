import "./globals.css";
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://runwaytwin.vercel.app"),
  title: "RunwayTwin – Celebrity Stylist AI",
  description:
    "Be Their Runway Twin ✨ — AI celebrity stylist with live shoppable links and affiliate-ready redirects.",
  openGraph: {
    title: "RunwayTwin – Celebrity Stylist AI",
    description:
      "Upload a celeb name or photo, set your budget, and shop a curated look instantly.",
    url: "https://runwaytwin.vercel.app",
    siteName: "RunwayTwin",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://runwaytwin.vercel.app" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-rt-ivory text-rt-black font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "RunwayTwin",
              url: "https://runwaytwin.vercel.app",
              logo: "https://runwaytwin.vercel.app/og.jpg",
              sameAs: [
                "https://instagram.com/runwaytwin",
                "https://www.tiktok.com/@runwaytwin"
              ]
            }),
          }}
        />
        {children}
      </body>
        {children}
      </body>
    </html>
  );
}
