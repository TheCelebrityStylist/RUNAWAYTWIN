// app/stylist/page.tsx
import type { Metadata } from "next";
import StylistChat from "@/components/StylistChat";
import type { Prefs } from "@/components/preferences/PreferencesPanel";
import JsonLd from "@/components/seo/JsonLd";

const BASE_URL = "https://runwaytwin.vercel.app";
const STYLIST_URL = `${BASE_URL}/stylist`;
const SOCIAL_PROFILES = [
  "https://www.instagram.com/yourhandle",
  "https://www.tiktok.com/@yourhandle",
];

export const metadata: Metadata = {
  title: "RunwayTwin │ Talk to a Celebrity-grade AI Stylist",
  description:
    "Head-to-toe outfits with real EU/US links, body-type flattering logic, capsule ideas, and alternates — powered by RunwayTwin.",
  alternates: { canonical: STYLIST_URL },
  keywords: [
    "AI stylist",
    "celebrity stylist",
    "personal stylist online",
    "RunwayTwin stylist",
    "outfit generator",
    "body type styling",
    "capsule wardrobe planner",
    "fashion AI",
    "Zendaya stylist",
  ],
  openGraph: {
    title: "RunwayTwin — AI Stylist",
    description:
      "Precise, shoppable looks with live EU/US stock. Body-type smart, budget-aware, always muse-ready.",
    url: STYLIST_URL,
    siteName: "RunwayTwin",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og.jpg`,
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
    images: [`${BASE_URL}/og.jpg`],
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

  const jsonLdPayload = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Stylist", item: STYLIST_URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "RunwayTwin AI Stylist Session",
      serviceType: "AI celebrity stylist consultation",
      url: STYLIST_URL,
      description:
        "Chat with RunwayTwin to receive celebrity-inspired outfits with brand, price, retailer links, alternates, and capsule guidance tailored to saved preferences.",
      provider: {
        "@type": "Organization",
        name: "RunwayTwin",
        url: BASE_URL,
        sameAs: SOCIAL_PROFILES,
      },
      areaServed: ["US", "UK", "EU", "Canada", "Australia"],
      termsOfService: `${BASE_URL}/terms`,
      offers: [
        {
          "@type": "Offer",
          name: "One-off AI look",
          price: "5",
          priceCurrency: "EUR",
          url: `${BASE_URL}/pricing#one-off`,
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Unlimited styling membership",
          price: "19",
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "19",
            priceCurrency: "EUR",
            unitText: "MONTH",
          },
          url: `${BASE_URL}/pricing#premium`,
          availability: "https://schema.org/InStock",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "RunwayTwin Stylist Chat",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: STYLIST_URL,
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description: "First look is complimentary for new guests.",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          price: "19",
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "19",
            priceCurrency: "EUR",
            unitText: "MONTH",
          },
          url: `${BASE_URL}/pricing#premium`,
        },
      ],
      applicationSubCategory: "FashionStyling",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does RunwayTwin deliver in each styling reply?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Every look includes top, bottom or dress, outerwear, shoes, bag and accessories with brand, price, retailer links, fit notes and capsule tips.",
          },
        },
        {
          "@type": "Question",
          name: "Will it remember my sizes and body type?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Preferences on the right rail persist so each new prompt respects your saved gender, sizes, body type, budget and keywords.",
          },
        },
        {
          "@type": "Question",
          name: "Do I get alternates and capsule ideas?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Absolutely — RunwayTwin supplies shoe and outerwear alternates with links plus remix ideas and styling tips for longevity.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to get a celebrity-inspired outfit with RunwayTwin",
      description: "Share a muse or occasion, confirm preferences, and receive an editorial-grade outfit in minutes.",
      supply: [
        { "@type": "HowToSupply", name: "Saved style preferences" },
        { "@type": "HowToSupply", name: "Muse, occasion or inspiration" },
      ],
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Open the RunwayTwin stylist",
          text: "Head to the stylist chat and review your saved sizes, budget, and style notes on the right rail.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Share your brief",
          text: "Describe the muse, occasion, weather or vibe. Attach inspiration if you like.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Shop the look",
          text: "RunwayTwin streams a draft instantly, then finalizes with brand, price, retailer links, alternates, and capsule tips you can pin to your closet.",
        },
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <JsonLd id="runwaytwin-stylist-schema" data={jsonLdPayload} />

      <section className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your AI Stylist</h1>
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
