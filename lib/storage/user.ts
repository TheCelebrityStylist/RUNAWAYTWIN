import { kvGet, kvSet } from "./kv";
import type { Preferences } from "@/lib/preferences/types";
import type { BillingPlan } from "@/lib/auth/types";

export type UserRecord = {
  id: string;
  email: string;
  salt: string;
  passwordHash: string;
  plan: BillingPlan;
  lookCredits: number;
  subscriptionActive: boolean;
  subscriptionRenewsAt?: string | null;
  freeLookUsed: boolean;
  preferences: Preferences;
  createdAt: string;
  updatedAt: string;
};

function userKey(id: string) {
  return `user:${id}`;
}

function emailKey(email: string) {
  return `user:email:${email.toLowerCase()}`;
}

export async function getUserById(id: string) {
  return kvGet<UserRecord>(userKey(id));
}

export async function getUserByEmail(email: string) {
  const id = await kvGet<string>(emailKey(email));
  if (!id) return null;
  return getUserById(id);
}

export async function saveUser(record: UserRecord) {
  await kvSet(userKey(record.id), record);
  await kvSet(emailKey(record.email), record.id);
}

export async function updateUser(id: string, patch: Partial<UserRecord>) {
  const existing = await getUserById(id);
  if (!existing) return null;
  const next: UserRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveUser(next);
  return next;
}

export function serializeUser(record: UserRecord) {
  return {
    id: record.id,
    email: record.email,
    plan: record.plan,
    lookCredits: record.lookCredits,
    subscriptionActive: record.subscriptionActive,
    subscriptionRenewsAt: record.subscriptionRenewsAt ?? null,
    freeLookUsed: record.freeLookUsed,
    preferences: record.preferences,
  };
}
