export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCheckoutSession } from "@/lib/payments/stripe";
import { getUserById, updateUser } from "@/lib/storage/user";

function isoFromUnix(seconds?: number | null) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  const sessionAuth = await getSession();
  if (!sessionAuth?.uid) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  try {
    const checkout = await getCheckoutSession(sessionId);
    const clientRef = checkout?.client_reference_id;
    if (!clientRef || clientRef !== sessionAuth.uid) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    const user = await getUserById(sessionAuth.uid);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (checkout.mode === "payment" && checkout.payment_status === "paid") {
      const lookCredits = (user.lookCredits || 0) + 1;
      const updated = await updateUser(user.id, {
        lookCredits,
        plan: "per_look",
      });
      return NextResponse.json({ ok: true, plan: updated?.plan, lookCredits }, { status: 200 });
    }

    if (checkout.mode === "subscription") {
      const sub = checkout.subscription;
      let renew: string | null = null;
      let active = false;
      if (sub && typeof sub === "object") {
        renew = isoFromUnix((sub as any).current_period_end);
        active = (sub as any).status === "active" || (sub as any).status === "trialing";
      }
      const updated = await updateUser(user.id, {
        plan: "subscription",
        subscriptionActive: active,
        subscriptionRenewsAt: renew,
      });
      return NextResponse.json({ ok: true, plan: updated?.plan, renew }, { status: 200 });
    }

    return NextResponse.json({ error: "Unhandled session" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Stripe confirm failed" }, { status: 500 });
  }
}
