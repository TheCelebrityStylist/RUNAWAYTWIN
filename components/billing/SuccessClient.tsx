"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "../account/AccountProvider";

export default function SuccessClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(sessionId ? "verifying" : "idle");
  const [message, setMessage] = useState<string>("");
  const { refresh } = useAccount();

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setStatus("error");
            setMessage(data?.error || "Unable to verify payment");
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setStatus("success");
          if (data?.plan === "subscription") {
            setMessage("You're on Unlimited — every look is on me.");
          } else if (typeof data?.lookCredits === "number") {
            setMessage(`Look credit added. You now have ${data.lookCredits} ready to spend.`);
          } else {
            setMessage("Plan updated. Let’s build the next outfit.");
          }
          await refresh();
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Verification failed. Contact support if the charge went through.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <section className="card space-y-4 p-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--rt-muted)" }}>
          Billing
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Payment confirmation</h1>
      </div>
      {status === "idle" && (
        <p className="text-sm" style={{ color: "var(--rt-charcoal)" }}>
          Missing checkout session. If you completed a payment, you can head back to the stylist — your looks are ready.
        </p>
      )}
      {status === "verifying" && (
        <p className="text-sm" style={{ color: "var(--rt-charcoal)" }}>
          Securing your plan… this takes just a second.
        </p>
      )}
      {status === "success" && (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: "var(--rt-charcoal)" }}>{message}</p>
          <a className="btn inline-flex" href="/stylist">
            Return to the stylist
          </a>
        </div>
      )}
      {status === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-rose-600">{message}</p>
          <a className="btn inline-flex" href="/contact">
            Reach support
          </a>
        </div>
      )}
    </section>
  );
}
