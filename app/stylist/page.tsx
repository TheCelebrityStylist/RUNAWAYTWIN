// FILE: app/stylist/page.tsx
import React from "react";
import StylistChat from "@/components/StylistChat";

// Server component that renders the client chat.
// We keep optional extra fields locally but only pass the props required by `Prefs`.
export const dynamic = "force-dynamic";

export default function StylistPage() {
  // NOTE: no explicit `: Prefs` annotation here to avoid excess-property checks.
  const initialPreferences = {
    gender: "female",
    sizes: { top: "M", bottom: "28", dress: "38", shoe: "39" }, // kept locally for future use
    bodyType: "hourglass",
    budget: "€300–€600",
    country: "NL",
  } as const;

  return (
    <main className="min-h-screen">
      <StylistChat
        initialPreferences={{
          gender: initialPreferences.gender,
          bodyType: initialPreferences.bodyType,
          budget: initialPreferences.budget,
          country: initialPreferences.country,
        }}
      />
    </main>
  );
}
