"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "./AccountProvider";
import AuthDialog from "./AuthDialog";

function initialsFrom(email: string | null | undefined) {
  if (!email) return "RT";
  const name = email.split("@")[0] || email;
  const parts = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/);
  if (!parts.length) return email.slice(0, 2).toUpperCase();
  const [first, second] = parts;
  const letters = (first?.[0] || "") + (second?.[0] || "");
  return letters ? letters.toUpperCase() : email.slice(0, 2).toUpperCase();
}

const actionButtonBase =
  "w-full rounded-full border border-[var(--rt-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--rt-charcoal)] transition hover:border-[var(--rt-charcoal)]/40 disabled:cursor-not-allowed disabled:opacity-70";

type Props = {
  variant?: "header" | "panel";
  onRequestAuth?: () => void;
  onPanelOpenChange?: (open: boolean) => void;
};

export default function AccountMenu({
  variant = "panel",
  onRequestAuth,
  onPanelOpenChange,
}: Props) {
  const { user, refresh, setUser } = useAccount();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [panelOpen, setPanelOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onPanelOpenChange?.(panelOpen);
  }, [panelOpen, onPanelOpenChange]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setPanelOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [panelOpen]);

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
    onRequestAuth?.();
    setDialogOpen(true);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setPanelOpen(false);
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
    } catch (error) {
      console.error(error);
      setMessage("Network error");
    } finally {
      setBillingLoading(false);
    }
  };

  const refreshPlan = async () => {
    await refresh();
    setMessage("Plan refreshed");
  };

  if (!user) {
    const wrapperClass =
      variant === "header"
        ? "flex items-center gap-3"
        : "flex flex-wrap items-center gap-2";
    const signInClass =
      variant === "header"
        ? "inline-flex items-center gap-2 rounded-full border border-[var(--rt-border)] bg-white/85 px-4 py-2 text-[13px] font-medium text-[var(--rt-charcoal)] shadow-sm transition hover:border-[var(--rt-charcoal)]/40 hover:bg-white"
        : "btn-outline h-10 px-4 text-sm";
    const joinClass =
      variant === "header"
        ? "inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#111111,#2c2c2c)] px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_20px_44px_rgba(15,23,42,0.22)] transition hover:-translate-y-[1px] hover:brightness-105"
        : "btn h-10 px-5 text-sm";

    return (
      <>
        <div className={wrapperClass}>
          <button type="button" className={signInClass} onClick={() => openDialog("login")}>
            Sign in
          </button>
          <button type="button" className={joinClass} onClick={() => openDialog("register")}>
            Join free
          </button>
        </div>
        <AuthDialog open={dialogOpen} mode={mode} onModeChange={setMode} onClose={() => setDialogOpen(false)} />
      </>
    );
  }

  const initials = initialsFrom(user.email);

  const triggerClass =
    variant === "header"
      ? "flex items-center gap-2 rounded-full border border-[var(--rt-border)] bg-white/80 px-2.5 py-1.5 text-sm font-medium text-[var(--rt-charcoal)] shadow-sm transition hover:border-[var(--rt-charcoal)]/35"
      : "flex items-center gap-2 rounded-full border border-[var(--rt-border)] bg-white/90 px-3 py-2 text-sm font-medium text-[var(--rt-charcoal)] shadow-sm transition hover:border-[var(--rt-charcoal)]/35";

  const avatarClass =
    "grid h-8 w-8 place-items-center rounded-full bg-[var(--rt-charcoal)] text-[11px] font-semibold uppercase tracking-wide text-white";

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className={triggerClass}
          onClick={() => setPanelOpen((prev) => !prev)}
          aria-expanded={panelOpen}
        >
          <span className={avatarClass}>{initials}</span>
          {variant !== "header" && (
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--rt-muted)]">{planLabel}</span>
              <span className="block text-[13px] font-semibold text-[var(--rt-charcoal)]">{looksText}</span>
            </span>
          )}
          {variant === "header" && (
            <span className="hidden text-left text-[12px] font-medium text-[var(--rt-muted)] sm:block">
              {planLabel}
            </span>
          )}
        </button>

        {panelOpen && (
          <div
            ref={panelRef}
            className="absolute right-0 top-full z-40 mt-3 w-72 rounded-2xl border border-[var(--rt-border)] bg-white/95 p-5 text-[13px] text-[var(--rt-charcoal)] shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rt-charcoal)] text-sm font-semibold uppercase text-white">
                {initials}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-[var(--rt-charcoal)]">{user.email}</p>
                <p className="text-[12px] text-[var(--rt-muted)]">{looksText}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--rt-border)] bg-[var(--rt-ivory)]/80 px-4 py-3 text-[12px] text-[var(--rt-muted)]">
              Plan status: <span className="font-semibold text-[var(--rt-charcoal)]">{planLabel}</span>
            </div>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                className={actionButtonBase}
                disabled={billingLoading}
                onClick={() => startCheckout("single")}
              >
                {billingLoading ? "Redirecting…" : "One-off look · $5"}
              </button>
              <button
                type="button"
                className={actionButtonBase}
                disabled={billingLoading}
                onClick={() => startCheckout("subscription")}
              >
                {billingLoading ? "Redirecting…" : "Unlimited · $19/mo"}
              </button>
              <button type="button" className={actionButtonBase} onClick={refreshPlan}>
                Refresh plan status
              </button>
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-full border border-transparent bg-transparent py-2 text-sm font-medium text-[var(--rt-muted)] transition hover:text-[var(--rt-charcoal)]"
              onClick={logout}
            >
              Sign out
            </button>

            {message && <p className="mt-3 text-center text-[12px] text-[var(--rt-muted)]">{message}</p>}
          </div>
        )}
      </div>

      <AuthDialog open={dialogOpen} mode={mode} onModeChange={setMode} onClose={() => setDialogOpen(false)} />
    </>
  );
}
