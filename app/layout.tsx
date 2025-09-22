import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountProvider } from "@/components/account/AccountProvider";
import SiteHeader from "@/components/layout/SiteHeader";
import JsonLd from "@/components/seo/JsonLd";
import { getSession } from "@/lib/auth/session";
import { getUserById, serializeUser } from "@/lib/storage/user";
import type { AccountUser } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

/* =========================================================================
   RunwayTwin — Root Layout (Global Header + Footer)
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

const BASE_URL = "https://runwaytwin.vercel.app";
const SOCIAL_PROFILES = [
  "https://www.instagram.com/yourhandle",
  "https://www.tiktok.com/@yourhandle",
];
const SITE_NAV_LINKS = [
  { name: "Stylist", path: "/stylist" },
  { name: "Pricing", path: "/pricing" },
  { name: "Journal", path: "/blog" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const GLOBAL_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RunwayTwin",
    url: BASE_URL,
    logo: `${BASE_URL}/icon.png`,
    sameAs: SOCIAL_PROFILES,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "support@runwaytwin.app",
        availableLanguage: ["en"],
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RunwayTwin",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/stylist?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  ...SITE_NAV_LINKS.map((link) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: link.name,
    url: `${BASE_URL}${link.path}`,
  })),
];

async function loadInitialUser(): Promise<AccountUser | null> {
  try {
    const session = await getSession();
    if (!session?.uid) return null;
    const record = await getUserById(session.uid);
    if (!record) return null;
    return serializeUser(record);
  } catch (err) {
    console.error("session bootstrap failed", err);
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await loadInitialUser();

  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[#FAF9F6] text-neutral-900 antialiased">
        <AccountProvider initialUser={initialUser}>
          <JsonLd id="runwaytwin-global-schema" data={GLOBAL_JSON_LD} />
          {/* Skip link (a11y) */}
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[999] focus:rounded focus:bg-black focus:px-3 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>

          {/* Trust bar */}
          <div className="border-b border-emerald-200 bg-emerald-50">
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-5 py-2 text-[13px] text-emerald-900">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              7-day money-back on Premium · One-off look €5 · Cancel anytime
            </div>
          </div>

          <SiteHeader />

          {/* Page content */}
          <main id="content">{children}</main>

          {/* Global Footer */}
          <footer className="border-t border-neutral-200 bg-[#F6F5F2]">
            <div className="mx-auto max-w-6xl px-5 py-10">
              <div className="grid grid-cols-1 gap-8 text-sm text-neutral-700 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <p className="font-semibold">RunwayTwin</p>
                  <p className="mt-2 max-w-xs text-neutral-600">
                    Celebrity stylist AI — editorial looks, budget-true picks, live EU/US stock.
                  </p>
                  <p className="mt-3 text-[12px] leading-5 text-neutral-500">
                    Disclosure: some outbound links are affiliate; we may earn a commission at no extra cost to you.
                  </p>
                </div>

                <nav aria-label="Product">
                  <p className="font-semibold">Product</p>
                  <ul className="mt-2 space-y-2">
                    <li><Link className="hover:underline" href="/stylist">Stylist</Link></li>
                    <li><Link className="hover:underline" href="/pricing">Pricing</Link></li>
                    <li><Link className="hover:underline" href="/blog">Journal</Link></li>
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
                  </ul>
                </nav>
              </div>

              <p className="mt-8 text-xs text-neutral-500">
                © {new Date().getFullYear()} RunwayTwin — All rights reserved.
              </p>
            </div>
          </footer>
        </AccountProvider>
      </body>
    </html>
  );
}
