import type { Preferences } from "@/lib/preferences/types";

export type BillingPlan = "free" | "per_look" | "subscription";

export type AccountUser = {
  id: string;
  email: string;
  plan: BillingPlan;
  lookCredits: number;
  subscriptionActive: boolean;
  subscriptionRenewsAt?: string | null;
  freeLookUsed: boolean;
  preferences?: Preferences;
};

export type SessionSummary = {
  user: AccountUser | null;
};
