import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountProvider } from "@/components/account/AccountProvider";
import SiteHeader from "@/components/layout/SiteHeader";
import JsonLd from "@/components/seo/JsonLd";
import { getSession } from "@/lib/auth/session";
import type { AccountUser } from "@/lib/auth/types";
import { CORE_KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/constants";
import { GLOBAL_JSON_LD, buildKeywordRichJsonLd } from "@/lib/seo/jsonld";
import { getUserById, serializeUser } from "@/lib/storage/user";

export const dynamic = "force-dynamic";

/* =========================================================================
   RunwayTwin — Root Layout (Global Header + Footer)
   ========================================================================= */

const DEFAULT_TITLE = `${SITE_NAME} — AI Celebrity Stylist │ Editorial Looks, Body-Type Flattering, Budget-True`;
const GLOBAL_SCHEMA = [...GLOBAL_JSON_LD, buildKeywordRichJsonLd()];

export const metadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  keywords: [...CORE_KEYWORDS],
  category: "Fashion",
  openGraph: {
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    site: "@runwaytwin",
  },
  icons: { icon: "/favicon.ico" },
};

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
          <JsonLd id="runwaytwin-global-schema" data={GLOBAL_SCHEMA} />
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
