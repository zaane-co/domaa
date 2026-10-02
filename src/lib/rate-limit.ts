// In-memory sliding-window rate limit, per server instance. On serverless
// platforms each invocation may land on a different container, so this is
// not a strict global limit — accepted for MVP, see plan notes. Swappable
// for a shared store (e.g. Redis) later without touching call sites.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 15;
const SWEEP_PROBABILITY = 0.01;

const hits = new Map<string, number[]>();

function prune(timestamps: number[]): number[] {
  const cutoff = Date.now() - WINDOW_MS;
  return timestamps.filter((t) => t > cutoff);
}

function sweep() {
  for (const [ip, timestamps] of hits) {
    if (prune(timestamps).length === 0) hits.delete(ip);
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  if (Math.random() < SWEEP_PROBABILITY) sweep();

  const existing = prune(hits.get(ip) ?? []);

  if (existing.length >= LIMIT) {
    hits.set(ip, existing);
    return { allowed: false, remaining: 0 };
  }

  existing.push(Date.now());
  hits.set(ip, existing);
  return { allowed: true, remaining: LIMIT - existing.length };
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
