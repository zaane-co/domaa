import type { Availability } from "@/lib/types";
import type { RegistrarAnswer } from "@/lib/availability/vercel";

// Either a bare availability (RDAP/WHOIS/DNS path) or a full registrar answer
// with pricing (Vercel path), so cache hits keep their real prices.
export type CachedValue = Availability | RegistrarAnswer;

interface CacheEntry {
  value: CachedValue;
  checkedAt: number;
}

const AVAILABLE_TTL_MS = 10 * 60 * 1000; // registered/available: 10 min
const UNKNOWN_TTL_MS = 60 * 1000; // unknown: 1 min, so hiccups retry sooner
const MAX_ENTRIES = 5000;

const cache = new Map<string, CacheEntry>();

function ttlFor(value: CachedValue): number {
  return value === "unknown" ? UNKNOWN_TTL_MS : AVAILABLE_TTL_MS;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.checkedAt > ttlFor(entry.value);
}

function evictIfNeeded() {
  if (cache.size <= MAX_ENTRIES) return;

  for (const [key, entry] of cache) {
    if (isExpired(entry)) cache.delete(key);
  }

  if (cache.size > MAX_ENTRIES) {
    cache.clear();
  }
}

export function getCached(domain: string): CachedValue | null {
  const entry = cache.get(domain);
  if (!entry) return null;
  if (isExpired(entry)) {
    cache.delete(domain);
    return null;
  }
  return entry.value;
}

export function setCached(domain: string, value: CachedValue): void {
  evictIfNeeded();
  cache.set(domain, { value, checkedAt: Date.now() });
}
