"use client";

import React, { useCallback, useState } from "react";
import { useAccount } from "./AccountProvider";
import type { AccountUser } from "@/lib/auth/types";

const INPUT_STYLE = {
  borderColor: "var(--rt-border)",
  background: "white",
};

type Mode = "login" | "register";

type Props = {
  open: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onClose: () => void;
};

export default function AuthDialog({ open, mode, onModeChange, onClose }: Props) {
  const { setUser } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setEmail("");
    setPassword("");
    setError(null);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const submit = useCallback(
    async (evt: React.FormEvent) => {
      evt.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || "Unable to authenticate");
          return;
        }
        const data: { user: AccountUser } = await res.json();
        setUser(data.user);
        close();
      } catch (err: any) {
        console.error(err);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [mode, email, password, setUser, close],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">RunwayTwin</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your runway twin"}
          </h2>
          <p className="text-sm text-neutral-600">
            Save your looks, preferences, and pick up where you left off.
          </p>
        </header>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-full border px-4 text-sm focus:outline-none"
              style={INPUT_STYLE}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.2em] text-neutral-500">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-full border px-4 text-sm focus:outline-none"
              style={INPUT_STYLE}
            />
            <p className="text-[11px] text-neutral-500">Use at least 8 characters.</p>
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button
            type="submit"
            className="btn w-full justify-center"
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Processing…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <footer className="mt-6 text-center text-sm text-neutral-600">
          {mode === "login" ? (
            <button className="underline-offset-4 hover:underline" onClick={() => onModeChange("register")}> 
              Need an account? Join now
            </button>
          ) : (
            <button className="underline-offset-4 hover:underline" onClick={() => onModeChange("login")}>
              Have an account? Sign in
            </button>
          )}
        </footer>

        <button
          type="button"
          onClick={close}
          className="absolute right-6 top-6 text-sm text-neutral-500 hover:text-neutral-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
