"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AccountUser, SessionSummary } from "@/lib/auth/types";

type AccountContextValue = {
  user: AccountUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AccountUser | null>>;
};

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

async function fetchSession(): Promise<SessionSummary> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) {
    return { user: null };
  }
  return res.json();
}

type Props = {
  initialUser: AccountUser | null;
  children: React.ReactNode;
};

export function AccountProvider({ initialUser, children }: Props) {
  const [user, setUser] = useState<AccountUser | null>(initialUser);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = await fetchSession();
      setUser(session.user ?? null);
    } catch (err) {
      console.error("session refresh failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialUser) return;
    // Attempt to hydrate session silently on mount.
    void refresh();
  }, [initialUser, refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, setUser }),
    [user, loading, refresh],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return ctx;
}
