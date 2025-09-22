export const SITE_NAME = "RunwayTwin" as const;
export const SITE_URL = "https://runwaytwin.vercel.app" as const;
export const SITE_DESCRIPTION =
  "Turn celebrity inspiration into outfits you actually wear. Upload a muse, set budget and preferences, and shop an editorial-grade look that flatters your body type.";
export const SITE_TAGLINE = "AI Celebrity Stylist Concierge" as const;
export const CONTACT_EMAIL = "support@runwaytwin.app" as const;
export const SUPPORT_PHONE = "+31 20 123 4567" as const;

export type SiteNavLink = {
  readonly name: string;
  readonly path: string;
  readonly description?: string;
};

export const PRIMARY_NAV_LINKS: readonly SiteNavLink[] = [
  {
    name: "Home",
    path: "/",
    description: "RunwayTwin home page — celebrity stylist AI overview",
  },
  {
    name: "Stylist",
    path: "/stylist",
    description: "Chat with the RunwayTwin AI stylist and receive shoppable outfits",
  },
  {
    name: "Pricing",
    path: "/pricing",
    description: "Membership plans, one-off looks and billing details",
  },
  {
    name: "Journal",
    path: "/blog",
    description: "Fashion editorials, trend reports and capsule wardrobe guides",
  },
  {
    name: "About",
    path: "/about",
    description: "RunwayTwin story, vision and team",
  },
  {
    name: "Contact",
    path: "/contact",
    description: "Press, partnerships and member support for RunwayTwin",
  },
] as const;

export const CORE_KEYWORDS = [
  "AI stylist",
  "celebrity stylist",
  "dress like Zendaya",
  "Rihanna outfit",
  "capsule wardrobe",
  "personal stylist online",
  "outfit generator",
  "body type styling",
  "affordable luxury",
  "high street outfits",
] as const;

export type ProductOffer = {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly priceCurrency: string;
  readonly url: string;
  readonly description: string;
  readonly billingPeriod?: "DAY" | "WEEK" | "MONTH" | "YEAR";
};

export const PRODUCT_OFFERS: readonly ProductOffer[] = [
  {
    id: "one-off",
    name: "One-off AI look",
    price: "5",
    priceCurrency: "EUR",
    url: "/pricing#one-off",
    description: "Pay per look after your complimentary styling session.",
  },
  {
    id: "premium",
    name: "Unlimited styling membership",
    price: "19",
    priceCurrency: "EUR",
    billingPeriod: "MONTH",
    url: "/pricing#premium",
    description: "Unlimited seasonal wardrobe planning and ongoing styling advice.",
  },
] as const;

export const SOCIAL_PROFILES = [
  "https://www.instagram.com/runwaytwin",
  "https://www.tiktok.com/@runwaytwin",
  "https://www.pinterest.com/runwaytwin",
  "https://www.linkedin.com/company/runwaytwin",
  "https://www.youtube.com/@runwaytwin",
] as const;
