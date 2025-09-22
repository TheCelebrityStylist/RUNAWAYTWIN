import type { JsonLdShape } from "@/components/seo/JsonLd";
import {
  CONTACT_EMAIL,
  CORE_KEYWORDS,
  PRIMARY_NAV_LINKS,
  PRODUCT_OFFERS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SOCIAL_PROFILES,
} from "./constants";
import { absoluteUrl } from "./utils";

export type BreadcrumbItem = {
  readonly name: string;
  readonly path: string;
};

export const GLOBAL_JSON_LD: JsonLdShape[] = [
  {
    "@context": "https://schema.org",
    "@type": ["Organization", "Brand"],
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: `${SITE_URL}/icon.png`,
    sameAs: SOCIAL_PROFILES,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: CONTACT_EMAIL,
        availableLanguage: ["en"],
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en",
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/stylist?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${SITE_NAME} Celebrity Stylist Concierge`,
    url: SITE_URL,
    areaServed: ["US", "UK", "EU", "Canada", "Australia"],
    serviceType: "AI celebrity stylist consultation",
    description: SITE_DESCRIPTION,
    sameAs: SOCIAL_PROFILES,
    makesOffer: PRODUCT_OFFERS.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      url: absoluteUrl(offer.url),
      availability: "https://schema.org/InStock",
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "RunwayTwin Styling Plans",
    url: absoluteUrl("/pricing"),
    itemListElement: PRODUCT_OFFERS.map((offer, index) => ({
      "@type": "Offer",
      position: index + 1,
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      url: absoluteUrl(offer.url),
      availability: "https://schema.org/InStock",
      priceSpecification: offer.billingPeriod
        ? {
            "@type": "UnitPriceSpecification",
            price: offer.price,
            priceCurrency: offer.priceCurrency,
            unitText: offer.billingPeriod,
          }
        : undefined,
    })),
  },
  ...PRIMARY_NAV_LINKS.map((link) => ({
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: link.name,
    url: absoluteUrl(link.path),
    description: link.description,
  })),
];

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): JsonLdShape {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildStylistJsonLd(): JsonLdShape[] {
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Stylist", path: "/stylist" },
  ]);

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "RunwayTwin AI Stylist Session",
    serviceType: "AI celebrity stylist consultation",
    url: absoluteUrl("/stylist"),
    description:
      "Chat with RunwayTwin to receive celebrity-inspired outfits with brand, price, retailer links, alternates and capsule guidance tailored to saved preferences.",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      sameAs: SOCIAL_PROFILES,
    },
    areaServed: ["US", "UK", "EU", "Canada", "Australia"],
    termsOfService: absoluteUrl("/terms"),
    offers: PRODUCT_OFFERS.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      url: absoluteUrl(offer.url),
      availability: "https://schema.org/InStock",
      priceSpecification: offer.billingPeriod
        ? {
            "@type": "UnitPriceSpecification",
            price: offer.price,
            priceCurrency: offer.priceCurrency,
            unitText: offer.billingPeriod,
          }
        : undefined,
    })),
  } as const;

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RunwayTwin Stylist Chat",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/stylist"),
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        description: "First look is complimentary for new guests.",
        availability: "https://schema.org/InStock",
      },
      ...PRODUCT_OFFERS.map((offer) => ({
        "@type": "Offer",
        price: offer.price,
        priceCurrency: offer.priceCurrency,
        url: absoluteUrl(offer.url),
        availability: "https://schema.org/InStock",
        priceSpecification: offer.billingPeriod
          ? {
              "@type": "UnitPriceSpecification",
              price: offer.price,
              priceCurrency: offer.priceCurrency,
              unitText: offer.billingPeriod,
            }
          : undefined,
      })),
    ],
    applicationSubCategory: "FashionStyling",
  } as const;

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What does RunwayTwin deliver in each styling reply?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Every look includes a top, bottom or dress, outerwear, shoes, bag and accessories with brand, price, retailer links, fit notes and capsule tips.",
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
      {
        "@type": "Question",
        name: "Can I shop in my country and currency?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RunwayTwin prefers EU/US stock, converts prices when needed, and flags if an item is unavailable so you always receive in-stock options.",
        },
      },
    ],
  } as const;

  const howTo = {
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
        text: "Head to the stylist chat and review your saved sizes, budget and style notes on the right rail.",
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
        text: "Receive a full outfit with retailer links, alternates and capsule guidance, then tap to shop each product.",
      },
    ],
    tool: [
      {
        "@type": "HowToTool",
        name: "RunwayTwin AI stylist chat",
      },
    ],
  } as const;

  const knowledgeGraph = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Popular RunwayTwin styling prompts",
    itemListElement: [
      "Zendaya red carpet look",
      "Hailey Bieber off-duty outfit",
      "Rihanna maternity style",
      "Rosie Huntington-Whiteley minimalist capsule",
    ].map((prompt, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: prompt,
    })),
  } as const;

  return [breadcrumb, service, software, faq, howTo, knowledgeGraph];
}

export function buildKeywordRichJsonLd(): JsonLdShape {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "RunwayTwin core styling topics",
    description: "Collection of key styling intents that RunwayTwin specializes in.",
    hasDefinedTerm: CORE_KEYWORDS.map((keyword) => ({
      "@type": "DefinedTerm",
      termCode: keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: keyword,
    })),
  };
}
