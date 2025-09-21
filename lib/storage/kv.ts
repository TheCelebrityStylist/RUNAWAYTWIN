import { Redis } from "@upstash/redis";

type MemoryStore = Map<string, unknown>;

let cachedRedis: Redis | null = null;
let memoryStore: MemoryStore | null = null;
let loggedFallback = false;

function hasRedisConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getMemory(): MemoryStore {
  if (!memoryStore) {
    memoryStore = new Map();
  }
  if (!loggedFallback) {
    loggedFallback = true;
    console.warn("[RunwayTwin] Upstash Redis env vars missing — using in-memory store");
  }
  return memoryStore;
}

export function getRedis(): Redis | null {
  if (!hasRedisConfig()) return null;
  if (cachedRedis) return cachedRedis;
  cachedRedis = Redis.fromEnv();
  return cachedRedis;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    const value = await redis.get<T>(key);
    return value ?? null;
  }
  const store = getMemory();
  return (store.get(key) as T) ?? null;
}

export async function kvSet<T>(key: string, value: T) {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, value);
    return;
  }
  const store = getMemory();
  store.set(key, value);
}

export async function kvDel(key: string) {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  const store = getMemory();
  store.delete(key);
}

export async function kvIncr(key: string): Promise<number> {
  const redis = getRedis();
  if (redis) {
    return redis.incr(key);
  }
  const store = getMemory();
  const next = ((store.get(key) as number | undefined) ?? 0) + 1;
  store.set(key, next);
  return next;
}
