import { Redis } from "@upstash/redis";

let cached: Redis | null = null;

export function getRedis(): Redis {
  if (cached) return cached;
  cached = Redis.fromEnv();
  return cached;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  const value = await redis.get<T>(key);
  return value ?? null;
}

export async function kvSet<T>(key: string, value: T) {
  const redis = getRedis();
  await redis.set(key, value);
}

export async function kvDel(key: string) {
  const redis = getRedis();
  await redis.del(key);
}

export async function kvIncr(key: string): Promise<number> {
  const redis = getRedis();
  return redis.incr(key);
}
