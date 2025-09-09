import "./globals.css";

export const metadata = {
  title: "RunwayTwin – Celebrity Stylist AI",
  description: "Be Their Runway Twin ✨ — AI celebrity stylist with live shoppable looks.",
  metadataBase: new URL("https://runwaytwin.vercel.app"),
  openGraph: {
    title: "RunwayTwin",
    description: "AI celebrity stylist with live product links.",
    url: "https://runwaytwin.vercel.app",
    siteName: "RunwayTwin",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
