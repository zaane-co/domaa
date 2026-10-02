import { promises as dns } from "node:dns";
import net from "node:net";
import type { Availability } from "@/lib/types";
import { getCached, setCached } from "@/lib/rdap/cache";
import { RDAP_BASE_URLS } from "@/lib/rdap/tld-config.generated";
import { checkWithWhois } from "@/lib/availability/whois";

// Node's Happy Eyeballs gives IPv4 only 250ms to connect before trying IPv6.
// Registries far from the server (e.g. .biz in us-west-2, seen from Lagos)
// take longer than that, so on networks without working IPv6 every request
// failed with ETIMEDOUT. 2s lets the IPv4 connection actually complete.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

// Bursts of ~25 parallel requests to one host see dropped/reset connections
// (Verisign) and short 429 throttling (Google's .dev/.app registry). So: cap
// in-flight requests per registry host, and retry transient failures.
const PER_HOST_LIMIT = 4;
const RETRY_BASE_DELAY_MS = 300;
// Throttled (429 without a long Retry-After) needs a longer pause to clear.
const THROTTLED_BASE_DELAY_MS = 1000;

// Some registries rate-limit for a long time (GMO, behind .shop, sends
// Retry-After of ~1 hour). Retrying those only extends the ban, so the host is
// skipped until the Retry-After passes. Anything shorter is retried normally.
const LONG_COOLDOWN_THRESHOLD_S = 15;
const MAX_COOLDOWN_S = 3600;
const hostCooldownUntil = new Map<string, number>();

export interface CheckOptions {
  /** Per-attempt timeout. */
  timeoutMs?: number;
  /** Total attempts, including the first. */
  attempts?: number;
  /** Epoch ms after which no new retry is started (keeps the request in budget). */
  deadline?: number;
}

const DEFAULTS = { timeoutMs: 2500, attempts: 3 } as const;

// RDAP servers missing from IANA's bootstrap file (ccTLDs aren't required to
// register theirs). Kept here, not in the generated file, so `npm run
// gen:tlds` doesn't wipe them. NiRA (.ng) verified 2026-10-01: 404 for free
// names, 200 for registered, second-level zones included.
const NIRA_RDAP = "https://rdap.nic.net.ng/";
const EXTRA_RDAP_BASE_URLS: Record<string, string> = {
  ng: NIRA_RDAP,
  "com.ng": NIRA_RDAP,
  "org.ng": NIRA_RDAP,
  "net.ng": NIRA_RDAP,
  "name.ng": NIRA_RDAP,
  "i.ng": NIRA_RDAP,
  "mobi.ng": NIRA_RDAP,
  "sch.ng": NIRA_RDAP,
  "edu.ng": NIRA_RDAP,
  "gov.ng": NIRA_RDAP,
};

function rdapBaseUrl(tld: string): string | undefined {
  return RDAP_BASE_URLS[tld] ?? EXTRA_RDAP_BASE_URLS[tld];
}

export function hasRdapSupport(tld: string): boolean {
  return rdapBaseUrl(tld) !== undefined;
}

// Fallback path for domains the registrar API (lib/availability/vercel.ts)
// couldn't answer: RDAP, then WHOIS, then DNS. Never throws: every failure
// resolves to "unknown", since a false "available" is worse than an
// inconclusive result.
export async function checkDomainAvailability(
  name: string,
  tld: string,
  options: CheckOptions = {},
): Promise<Availability> {
  const domain = `${name}.${tld}`;

  const cached = getCached(domain);
  if (typeof cached === "string") return cached;
  if (cached) return cached.available ? "available" : "registered";

  let availability = await checkWithRdap(domain, tld, options);

  // Registry's RDAP failed, is rate-limiting, or doesn't exist (.io/.co/.me):
  // WHOIS is a separate service with its own limits.
  if (availability === "unknown" && !(options.deadline && Date.now() > options.deadline)) {
    availability = await checkWithWhois(domain, tld);
  }

  // Neither answered: DNS can still prove a domain is taken (it has
  // nameservers), though it can never prove one is free.
  if (availability === "unknown" && (await hasNameservers(domain))) {
    availability = "registered";
  }

  setCached(domain, availability);
  return availability;
}

async function checkWithRdap(
  domain: string,
  tld: string,
  options: CheckOptions,
): Promise<Availability> {
  const baseUrl = rdapBaseUrl(tld);
  if (!baseUrl) return "unknown";

  const { timeoutMs = DEFAULTS.timeoutMs, attempts = DEFAULTS.attempts, deadline } = options;
  const host = new URL(baseUrl).host;

  let availability: Availability = "unknown";
  let lastOutcome: RdapOutcome | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      const base = lastOutcome === "throttled" ? THROTTLED_BASE_DELAY_MS : RETRY_BASE_DELAY_MS;
      const delay = base * 2 ** (attempt - 1) + Math.random() * 150;
      if (deadline && Date.now() + delay + timeoutMs > deadline) break;
      await sleep(delay);
    }

    if ((hostCooldownUntil.get(host) ?? 0) > Date.now()) break;

    lastOutcome = await withHostSlot(host, () => queryRdap(baseUrl, host, domain, timeoutMs));
    if (lastOutcome !== "retry" && lastOutcome !== "throttled") {
      availability = lastOutcome;
      break;
    }
  }

  return availability;
}

type RdapOutcome = Availability | "retry" | "throttled";

async function queryRdap(
  baseUrl: string,
  host: string,
  domain: string,
  timeoutMs: number,
): Promise<RdapOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}domain/${domain}`, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
    });

    if (res.status === 404) return "available";
    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
      if (retryAfter != null && retryAfter > LONG_COOLDOWN_THRESHOLD_S) {
        hostCooldownUntil.set(host, Date.now() + Math.min(retryAfter, MAX_COOLDOWN_S) * 1000);
        return "unknown";
      }
      return "throttled";
    }
    // Server errors are transient; other 4xx won't change on retry.
    if (res.status >= 500) return "retry";
    if (!res.ok) return "unknown";

    const body = await res.json().catch(() => null);
    if (!body || typeof body !== "object") return "retry";

    return "registered";
  } catch {
    // Timeout (AbortError), connection reset, TLS error: all worth retrying.
    return "retry";
  } finally {
    clearTimeout(timeout);
  }
}

// Retry-After is either delay-seconds or an HTTP date.
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, (date - Date.now()) / 1000);
}

async function hasNameservers(domain: string): Promise<boolean> {
  try {
    const records = await withTimeout(dns.resolveNs(domain), 1500);
    return records.length > 0;
  } catch {
    return false;
  }
}

// Per-host semaphore. FIFO, so whatever asks first (the user's exact domain)
// gets the first free slot.
const hostSlots = new Map<string, { active: number; queue: (() => void)[] }>();

async function withHostSlot<T>(host: string, fn: () => Promise<T>): Promise<T> {
  let slot = hostSlots.get(host);
  if (!slot) {
    slot = { active: 0, queue: [] };
    hostSlots.set(host, slot);
  }

  if (slot.active >= PER_HOST_LIMIT) {
    // Woken by a finishing request that hands its slot over directly, so
    // `active` is not incremented here.
    await new Promise<void>((resolve) => slot.queue.push(resolve));
  } else {
    slot.active++;
  }

  try {
    return await fn();
  } finally {
    const next = slot.queue.shift();
    if (next) next();
    else slot.active--;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
