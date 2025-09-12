import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

/* =========================================================================
   RunwayTwin — Root Layout
   - Server Component only (no client hooks)
   - Global premium Header + Footer for all pages
   - Accessible nav, mobile-friendly, SEO-safe
   ========================================================================= */

export const metadata: Metadata = {
  title: {
    default:
      "RunwayTwin — AI Celebrity Stylist │ Editorial Looks, Body-Type Flattering, Budget-True",
    template: "%s | RunwayTwin",
  },
  description:
    "Turn celebrity inspiration into outfits you actually wear. Upload a celeb photo or name, set budget & occasion, and get an editorial-grade look — tailored to your body type with EU/US stock.",
  metadataBase: new URL("https://runwaytwin.vercel.app"),
  alternates: { canonical: "https://runwaytwin.vercel.app" },
  icons: { icon: "/favicon.ico" },
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200/70 bg-white/70 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
        {/* Top announcement / trust bar */}
        <div className="border-b border-emerald-200 bg-emerald-50">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-5 py-2 text-[13px] text-emerald-900">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            7-day money-back on Premium · One-off look €5 · Cancel anytime
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-[#FAF9F6]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FAF9F6]/80">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-base font-semibold tracking-tight hover:opacity-80"
                aria-label="RunwayTwin Home"
              >
                RunwayTwin
              </Link>
              <div className="hidden items-center gap-2 sm:flex">
                <Badge>Editorial Taste</Badge>
                <Badge>Body-Type Flattering</Badge>
                <Badge>Budget-True</Badge>
              </div>
            </div>

            {/* Primary Nav */}
            <nav aria-label="Main" className="hidden md:block">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <Link className="hover:underline underline-offset-4" href="/">
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:underline underline-offset-4"
                    href="/stylist"
                  >
                    Stylist
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:underline underline-offset-4"
                    href="/pricing"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:underline underline-offset-4"
                    href="/blog"
                  >
                    Journal
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:underline underline-offset-4"
                    href="/about"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    className="hover:underline underline-offset-4"
                    href="/contact"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-2">
              <Link
                href="/stylist"
                className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                ✨ Try the Stylist
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        {children}

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
          <div className="mx-auto max-w-6xl px-5 py-10">
            <div className="grid grid-cols-1 gap-8 text-sm text-neutral-700 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <p className="font-semibold">RunwayTwin</p>
                <p className="mt-2 max-w-xs text-neutral-600">
                  Celebrity stylist AI — editorial looks, budget-true picks, live
                  EU/US stock.
                </p>
                <p className="mt-3 text-[12px] leading-5 text-neutral-500">
                  Disclosure: some outbound links are affiliate; we may earn a
                  commission at no extra cost to you.
                </p>
              </div>

              <nav aria-label="Product">
                <p className="font-semibold">Product</p>
                <ul className="mt-2 space-y-2">
                  <li>
                    <Link className="hover:underline" href="/stylist">
                      Stylist
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:underline" href="/pricing">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:underline" href="/blog">
                      Journal
                    </Link>
                  </li>
                </ul>
              </nav>

              <nav aria-label="Company">
                <p className="font-semibold">Company</p>
                <ul className="mt-2 space-y-2">
                  <li>
                    <Link className="hover:underline" href="/about">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:underline" href="/contact">
                      Contact
                    </Link>
                  </li>
                </ul>
              </nav>

              <nav aria-label="Legal">
                <p className="font-semibold">Legal</p>
                <ul className="mt-2 space-y-2">
                  <li>
                    <Link
                      className="hover:underline"
                      href="/affiliate-disclosure"
                    >
                      Affiliate Disclosure
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:underline" href="/privacy">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:underline" href="/terms">
                      Terms
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            <p className="mt-8 text-xs text-neutral-500">
              © {new Date().getFullYear()} RunwayTwin — All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}


