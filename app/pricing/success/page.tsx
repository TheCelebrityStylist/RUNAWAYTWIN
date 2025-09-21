import type { Metadata } from "next";
import { Suspense } from "react";
import SuccessClient from "@/components/billing/SuccessClient";

export const metadata: Metadata = {
  title: "Payment success │ RunwayTwin",
};

export default function PricingSuccessPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 lg:px-8 space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--rt-muted)" }}>
          Thank you
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">We’ve reserved your spot on the list</h1>
        <p className="text-[15px]" style={{ color: "var(--rt-charcoal)" }}>
          Stay on this page while we confirm your payment and unlock the stylist. It takes just a moment.
        </p>
      </section>
      <Suspense
        fallback={
          <div className="card p-6 text-sm" style={{ color: "var(--rt-charcoal)" }}>
            Checking your membership…
          </div>
        }
      >
        <SuccessClient />
      </Suspense>
    </main>
  );
}
