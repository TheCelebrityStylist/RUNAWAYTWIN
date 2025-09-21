"use client";

import React, { useMemo, useState } from "react";
import { useAccount } from "./AccountProvider";
import AuthDialog from "./AuthDialog";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]"
      style={{ borderColor: "var(--rt-border)", background: "white", color: "var(--rt-charcoal)" }}
    >
      {children}
    </span>
  );
}

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
    <div className="relative flex items-center gap-3">
      {user ? (
        <>
          <div className="hidden text-right text-xs leading-tight md:block">
            <p className="font-semibold tracking-tight">{user.email}</p>
            <p className="text-neutral-600">{looksText}</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill>{user.plan === "subscription" && user.subscriptionActive ? "Unlimited" : user.plan === "per_look" ? "On-demand" : "Free"}</Pill>
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
          </div>
        </>
      ) : (
        <>
          <Pill>{looksText}</Pill>
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

      {user && (
        <button
          type="button"
          className="absolute -bottom-8 right-0 text-[11px] text-neutral-500 underline-offset-4 hover:underline"
          onClick={refreshPlan}
        >
          Refresh plan
        </button>
      )}
    </div>
  );
}
