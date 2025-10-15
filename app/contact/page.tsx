import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/seo/JsonLd";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/constants";

const BASE_URL = "https://runwaytwin.vercel.app";
const CONTACT_URL = `${BASE_URL}/contact`;
const SUPPORT_EMAIL = "support@runwaytwin.app";

export const metadata: Metadata = {
  title: "Contact RunwayTwin — Luxury AI Stylist Support",
  description:
    "Need help with your AI stylist look, billing, or partnerships? Reach the RunwayTwin team for concierge-level support within 1–2 business days.",
  alternates: { canonical: CONTACT_URL },
  keywords: [
    "RunwayTwin contact",
    "AI stylist support",
    "RunwayTwin press",
    "RunwayTwin partnerships",
    "RunwayTwin email",
  ],
  openGraph: {
    title: "Contact RunwayTwin — Luxury AI Stylist Support",
    description:
      "Questions about your styled looks, billing or partnerships? Our team replies in 1–2 business days.",
    url: CONTACT_URL,
    siteName: "RunwayTwin",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "RunwayTwin contact concierge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact RunwayTwin — Luxury AI Stylist Support",
    description: "Concierge-level help for fashion lovers, press, and partners — within 1–2 business days.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function ContactPage() {
  const jsonLdPayload = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Contact",
          item: CONTACT_URL,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact RunwayTwin",
      url: CONTACT_URL,
      mainEntity: {
        "@type": "Organization",
        name: "RunwayTwin",
        url: BASE_URL,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: SUPPORT_EMAIL,
            availableLanguage: ["en"],
            areaServed: ["EU", "US"],
            hoursAvailable: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
              ],
            },
          },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How quickly will the RunwayTwin team reply?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We respond to styling, billing, and partnership messages within 1–2 business days.",
          },
        },
        {
          "@type": "Question",
          name: "What details should I include in my message?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Share your account email, the look ID or muse you referenced, and any deadlines so we can prioritize appropriately.",
          },
        },
        {
          "@type": "Question",
          name: "Do you support press and brand partnership inquiries?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes — include your publication or brand details and timeline. Our partnerships desk will coordinate next steps.",
          },
        },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-14">
      <JsonLd id="runwaytwin-contact-schema" data={jsonLdPayload} />
      <h1 className="font-serif text-4xl tracking-tight">Contact</h1>
      <p className="mt-3 max-w-2xl text-neutral-700">
        Questions, press, partnerships — drop us a note and we’ll get back within 1–2 business days.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
      <section aria-labelledby="contact-support" className="mt-12">
        <h2 id="contact-support" className="text-base font-semibold text-neutral-900">
          How we support you
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900">Concierge inbox</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Email us anytime at <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Share your account email and the muse or look you were exploring so we can reply with context.
            </p>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900">Partnerships &amp; press</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Looking to feature RunwayTwin or collaborate? Include your outlet or brand, the opportunity, and timelines — the team will respond within two business days.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
