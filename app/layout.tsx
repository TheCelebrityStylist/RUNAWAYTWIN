import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Root Layout (Global Header + Footer)
   - Server Component only (no 'use client')
   - Sticky header with backdrop blur
   - Single global footer
   - Accessibility: skip link
   ========================================================================= */

export const metadata: Metadata = {
  title: {
    default: "RunwayTwin — Shop Any Celebrity Look From a Photo",
    template: "%s | RunwayTwin",
  },
  description:
    "Upload any outfit photo or name a celebrity. RunwayTwin spots every piece and shows where to buy it at high-street, mid-range or luxury prices.",
  metadataBase: new URL("https://runwaytwin.com"),
  openGraph: { siteName: "RunwayTwin", type: "website", locale: "en_GB" },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
        {/* Skip link (a11y) */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[999] focus:rounded focus:bg-black focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        {/* Trust bar */}
        <div className="border-b border-neutral-200 bg-[#F3EFE7]">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-5 py-2 text-[13px] text-neutral-800">
            <span className="inline-flex h-2 w-2 rounded-full bg-[hsl(27_65%_42%)]" />
            3 free looks every month · Pro €9.99/month with 7 days free · Cancel anytime
          </div>
        </div>

        {/* Sticky Header */}
        <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-[#FAF9F6]/90 backdrop-blur supports-[backdrop-filter]:bg-[#FAF9F6]/70">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            {/* Brand + badges */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-base font-semibold tracking-tight hover:opacity-80"
                aria-label="RunwayTwin Home"
              >
                RunwayTwin
              </Link>
            </div>

            {/* Primary Nav */}
            <nav aria-label="Main" className="hidden md:block">
              <ul className="flex items-center gap-6 text-sm">
                <li><Link className="hover:underline underline-offset-4" href="/shop-the-look">Shop the Look</Link></li>
                <li><Link className="hover:underline underline-offset-4" href="/blog">Style Guides</Link></li>
                <li><Link className="hover:underline underline-offset-4" href="/pricing">Pricing</Link></li>
                <li><Link className="hover:underline underline-offset-4" href="/about">About</Link></li>
              </ul>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-2">
              <Link
                href="/shop-the-look"
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Open RunwayTwin
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="content">{children}</main>

        {/* Global Footer */}
        <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <div className="grid grid-cols-1 gap-8 text-sm text-neutral-700 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <p className="font-semibold">RunwayTwin</p>
                <p className="mt-2 max-w-xs text-neutral-600">
                  Upload any outfit photo. See every piece. Shop it at high-street, mid-range or luxury prices.
                </p>
                <p className="mt-3 text-[12px] leading-5 text-neutral-500">
                  Disclosure: some outbound links are affiliate; we may earn a commission at no extra cost to you.
                </p>
              </div>

              <nav aria-label="Product">
                <p className="font-semibold">Product</p>
                <ul className="mt-2 space-y-2">
                  <li><Link className="hover:underline" href="/shop-the-look">Shop the Look</Link></li>
                  <li><Link className="hover:underline" href="/stylist">AI Stylist</Link></li>
                  <li><Link className="hover:underline" href="/pricing">Pricing</Link></li>
                  <li><Link className="hover:underline" href="/blog">Style Guides</Link></li>
                </ul>
              </nav>

              <nav aria-label="Company">
                <p className="font-semibold">Company</p>
                <ul className="mt-2 space-y-2">
                  <li><Link className="hover:underline" href="/about">About</Link></li>
                  <li><Link className="hover:underline" href="/contact">Contact</Link></li>
                </ul>
              </nav>

              <nav aria-label="Legal">
                <p className="font-semibold">Legal</p>
                <ul className="mt-2 space-y-2">
                  <li><Link className="hover:underline" href="/affiliate-disclosure">Affiliate Disclosure</Link></li>
                  <li><Link className="hover:underline" href="/privacy">Privacy</Link></li>
                  <li><Link className="hover:underline" href="/terms">Terms</Link></li>
                  <li><Link className="hover:underline" href="/withdraw">Withdraw from contract here</Link></li>
                </ul>
              </nav>
            </div>

            <p className="mt-8 text-xs text-neutral-500">
              © {new Date().getFullYear()} RunwayTwin, a trade name of Adapthrive.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}


