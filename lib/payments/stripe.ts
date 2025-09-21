const STRIPE_API_BASE = "https://api.stripe.com/v1";

function requireEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} env var missing`);
  }
  return value;
}

async function stripeRequest(path: string, init: RequestInit = {}) {
  const secret = requireEnv("STRIPE_SECRET_KEY");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${secret}`);
  headers.set("Stripe-Version", "2022-11-15");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }
  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe ${res.status}: ${text}`);
  }
  return res.json();
}

export async function createCheckoutSession(params: {
  mode: "payment" | "subscription";
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}) {
  const body = new URLSearchParams();
  body.set("mode", params.mode);
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("client_reference_id", params.clientReferenceId);
  if (params.customerEmail) {
    body.set("customer_email", params.customerEmail);
  }
  if (params.mode === "subscription") {
    body.append("line_items[0][price]", params.priceId);
  } else {
    body.append("line_items[0][price]", params.priceId);
    body.append("line_items[0][quantity]", "1");
  }
  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      body.set(`metadata[${key}]`, value);
    }
  }
  return stripeRequest("/checkout/sessions", {
    method: "POST",
    body,
  });
}

export async function getCheckoutSession(sessionId: string) {
  const query = new URLSearchParams({ "expand[]": "subscription" });
  return stripeRequest(`/checkout/sessions/${sessionId}?${query.toString()}`);
}

export async function getSubscription(subId: string) {
  return stripeRequest(`/subscriptions/${subId}`);
}
