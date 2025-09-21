"use client";

import React, { useMemo, useState } from "react";
import { useAccount } from "./AccountProvider";
import AuthDialog from "./AuthDialog";

export default function AccountMenu() {
  const { user, refresh, setUser } = useAccount();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const looksText = useMemo(() => {
    if (!user) return "1 free look";
    if (user.subscriptionActive) return "Unlimited looks";
    if (!user.freeLookUsed) return "1 free look";
    return `${user.lookCredits} look${user.lookCredits === 1 ? "" : "s"} left`;
  }, [user]);

  const planLabel = useMemo(() => {
    if (!user) return "Guest";
    if (user.subscriptionActive) return "Unlimited member";
    if (user.lookCredits > 0) return `${user.lookCredits} credit${user.lookCredits === 1 ? "" : "s"}`;
    if (!user.freeLookUsed) return "Welcome look";
    return "Member";
  }, [user]);

  const openDialog = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setDialogOpen(true);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMessage("Signed out");
  };

  const startCheckout = async (tier: "single" | "subscription") => {
    setBillingLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data?.error || "Unable to start checkout");
        return;
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error");
    } finally {
      setBillingLoading(false);
    }
  };

  const refreshPlan = async () => {
    await refresh();
    setMessage("Plan updated");
  };

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <div className="hidden text-right text-xs leading-tight lg:block">
            <p className="font-semibold tracking-tight text-[var(--rt-charcoal)]">{user.email}</p>
            <p className="text-neutral-600">{looksText}</p>
          </div>
          <span className="hidden rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--rt-muted)] lg:inline-flex"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
          >
            {planLabel}
          </span>
          <button
            type="button"
            className="hidden rounded-full border px-3 py-1 text-[12px] md:inline-flex"
            style={{ borderColor: "var(--rt-border)", background: "var(--rt-ivory)" }}
            disabled={billingLoading}
            onClick={() => startCheckout("single")}
          >
            {billingLoading ? "Redirecting…" : "Buy a look"}
          </button>
          <button
            type="button"
            className="hidden rounded-full border px-3 py-1 text-[12px] md:inline-flex"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            disabled={billingLoading}
            onClick={() => startCheckout("subscription")}
          >
            {billingLoading ? "Redirecting…" : "Go unlimited"}
          </button>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-[12px]"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            onClick={logout}
          >
            Sign out
          </button>
          <button
            type="button"
            className="hidden text-[11px] text-neutral-500 underline-offset-4 hover:underline md:inline"
            onClick={refreshPlan}
          >
            Refresh plan
          </button>
        </>
      ) : (
        <>
          <span className="hidden text-xs text-neutral-600 sm:inline">{looksText}</span>
          <button
            type="button"
            className="rounded-full border px-3 py-1 text-[12px]"
            style={{ borderColor: "var(--rt-border)", background: "white" }}
            onClick={() => openDialog("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className="btn hidden md:inline-flex"
            onClick={() => openDialog("register")}
          >
            Join free
          </button>
        </>
      )}

      {message && <span className="text-xs text-neutral-600">{message}</span>}

      <AuthDialog open={dialogOpen} mode={mode} onModeChange={setMode} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
