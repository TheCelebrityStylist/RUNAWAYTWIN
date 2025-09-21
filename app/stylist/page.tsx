// app/stylist/page.tsx
import type { Metadata } from "next";
import StylistChat from "@/components/StylistChat";
import type { Prefs } from "@/components/preferences/PreferencesPanel";

export const metadata: Metadata = {
  title: "RunwayTwin │ Talk to a Celebrity-grade AI Stylist",
  description:
    "Head-to-toe outfits with real EU/US links, body-type flattering logic, and capsule tips — powered by RunwayTwin.",
  openGraph: {
    title: "RunwayTwin — AI Stylist",
    description:
      "Precise, shoppable looks. Body-type smart. Budget-aware. EU/US stock.",
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

  return (
    <main className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-6 space-y-6">
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
