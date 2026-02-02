// FILE: lib/style/store.ts
import type { LookResponse, StylePlan } from "@/lib/style/types";

type Job = {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: LookResponse["status"];
  progress: Record<string, number>;
  errors: Array<{ retailer: string; slot: string; message: string }>;
  logs: string[];
  plan: StylePlan;
  result: LookResponse | null;
};

type CacheEntry = {
  expiresAt: number;
  result: LookResponse;
};

const JOBS = new Map<string, Job>();
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function makeJob(plan: StylePlan): Job {
  const job: Job = {
    id: plan.look_id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "queued",
    progress: {},
    errors: [],
    logs: [],
    plan,
    result: null,
  };
  JOBS.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | null {
  return JOBS.get(id) ?? null;
}

export function updateJob(id: string, next: Partial<Job>) {
  const job = JOBS.get(id);
  if (!job) return;
  const updated: Job = { ...job, ...next, updatedAt: Date.now() };
  JOBS.set(id, updated);
}

export function dropJob(id: string) {
  JOBS.delete(id);
}

export function addJobLog(id: string, line: string) {
  const job = JOBS.get(id);
  if (!job) return;
  updateJob(id, { logs: [...job.logs, line].slice(-200) });
}

export function addJobError(id: string, error: { retailer: string; slot: string; message: string }) {
  const job = JOBS.get(id);
  if (!job) return;
  updateJob(id, { errors: [...job.errors, error].slice(-200) });
}

export function updateJobProgress(id: string, slot: string, count: number) {
  const job = JOBS.get(id);
  if (!job) return;
  updateJob(id, { progress: { ...job.progress, [slot]: count } });
}

export function cacheKey(plan: StylePlan): string {
  const base = {
    queries: plan.search_queries,
    budget: plan.budget_total,
    currency: plan.currency,
    region: plan.preferences.country,
  };
  return JSON.stringify(base);
}

export function getCached(key: string): LookResponse | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return hit.result;
}

export function setCached(key: string, result: LookResponse) {
  CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}
