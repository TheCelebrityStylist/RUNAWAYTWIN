export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/storage/user";
import { createCheckoutSession } from "@/lib/payments/stripe";

function requireEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} missing`);
  }
  return value;
}

function absoluteUrl(req: NextRequest, path: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "https://runwaytwin.vercel.app";
  return `${origin.replace(/\/$/, "")}${path}`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.uid) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const user = await getUserById(session.uid);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const tier = body?.tier === "subscription" ? "subscription" : "single";

  const priceId = tier === "subscription" ? requireEnv("STRIPE_PRICE_SUBSCRIPTION") : requireEnv("STRIPE_PRICE_SINGLE_LOOK");

  try {
    const checkout = await createCheckoutSession({
      mode: tier === "subscription" ? "subscription" : "payment",
      priceId,
      successUrl: absoluteUrl(req, `/pricing/success?session_id={CHECKOUT_SESSION_ID}`),
      cancelUrl: absoluteUrl(req, `/pricing`),
      clientReferenceId: user.id,
      customerEmail: user.email,
      metadata: { tier },
    });
    return NextResponse.json({ url: checkout?.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Stripe error" }, { status: 500 });
  }
}
