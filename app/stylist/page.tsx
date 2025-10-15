// app/stylist/page.tsx
import type { Metadata } from "next";
import StylistChat from "@/components/StylistChat";
import type { Prefs } from "@/components/preferences/PreferencesPanel";
import JsonLd from "@/components/seo/JsonLd";
import { CORE_KEYWORDS } from "@/lib/seo/constants";
import { buildStylistJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/utils";

const STYLIST_URL = absoluteUrl("/stylist");
const OG_IMAGE = absoluteUrl("/og.jpg");
const STYLIST_SCHEMA = buildStylistJsonLd();
const STYLIST_KEYWORDS: string[] = [
  ...CORE_KEYWORDS,
  "RunwayTwin stylist",
  "AI fashion assistant",
  "celebrity outfit generator",
  "body type outfit ideas",
];

export const metadata: Metadata = {
  title: "RunwayTwin │ Talk to a Celebrity-grade AI Stylist",
  description:
    "Head-to-toe outfits with real EU/US links, body-type flattering logic, capsule ideas, and alternates — powered by RunwayTwin.",
  alternates: { canonical: STYLIST_URL },
  keywords: STYLIST_KEYWORDS,
  openGraph: {
    title: "RunwayTwin — AI Stylist",
    description:
      "Precise, shoppable looks with live EU/US stock. Body-type smart, budget-aware, always muse-ready.",
    url: STYLIST_URL,
    siteName: "RunwayTwin",
    type: "website",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "RunwayTwin AI stylist interface preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunwayTwin — AI Stylist",
    description:
      "Chat like you would with a celebrity stylist. Real products, body-type fit notes, capsule tips, alternates.",
    images: [OG_IMAGE],
  },
};

export default function StylistPage() {
  const initialPreferences: Prefs = {
    gender: "female",
    sizes: { top: "M", bottom: "28", dress: "38", shoe: "39" },
    bodyType: "hourglass",
    budget: "€300–€600",
    country: "NL",
    styleKeywords: ["minimal", "elevated basics", "clean lines"],
  };

  const jsonLdPayload = STYLIST_SCHEMA;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <JsonLd id="runwaytwin-stylist-schema" data={jsonLdPayload} />

      <section className="space-y-2">
        <h1
          id="rt-stylist-hero"
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          Your AI Stylist
        </h1>
        <p className="text-[15px]" style={{ color: "var(--rt-charcoal)" }}>
          Drop a muse, an image, and an occasion. RunwayTwin stitches body-type logic with live product search to ship
          shoppable looks, alternates, and capsule remixes — all tailored to your saved preferences.
        </p>
      </section>

      <section>
        <StylistChat initialPreferences={initialPreferences} />
      </section>
    </main>
  );
}
