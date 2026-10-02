// Vercel's registrar search endpoint: public (no account or token), checks up
// to 200 domains per request, and returns real availability plus pricing.
// Measured: 195 domains in ~3.8s, 8 back-to-back full searches with no
// throttling. https://vercel.com/docs/domains/registrar-api
//
// It reports unsupported TLDs (e.g. .ng) as "available: false", so answers are
// only trusted for TLDs on Vercel's supported list; everything else falls
// through to the RDAP/WHOIS/DNS chain.

const API = "https://api.vercel.com/v1/registrar";
const MAX_PER_REQUEST = 200;
const REQUEST_TIMEOUT_MS = 12_000;
const SUPPORTED_TTL_MS = 24 * 60 * 60 * 1000;

export interface RegistrarAnswer {
  available: boolean;
  /** Per-year prices, normalised from the quoted registration period. */
  priceUsd: number | null;
  renewalPriceUsd: number | null;
  premium: boolean;
  /** Minimum registration term in years (e.g. 2 for .ai). */
  minYears: number;
}

interface SearchResult {
  domain: string;
  available: boolean;
  price?: number;
  renewalPrice?: number;
  premium?: boolean;
  years?: number;
}

let supportedTlds: { set: Set<string>; fetchedAt: number } | null = null;
let supportedInFlight: Promise<Set<string> | null> | null = null;

async function getSupportedTlds(): Promise<Set<string> | null> {
  if (supportedTlds && Date.now() - supportedTlds.fetchedAt < SUPPORTED_TTL_MS) {
    return supportedTlds.set;
  }
  supportedInFlight ??= (async () => {
    try {
      const res = await fetchWithTimeout(`${API}/tlds/supported`, {}, REQUEST_TIMEOUT_MS);
      if (!res.ok) return supportedTlds?.set ?? null;
      const list: unknown = await res.json();
      if (!Array.isArray(list)) return supportedTlds?.set ?? null;
      const set = new Set(list.filter((t): t is string => typeof t === "string"));
      supportedTlds = { set, fetchedAt: Date.now() };
      return set;
    } catch {
      // Keep serving a stale list rather than dropping to the slow path.
      return supportedTlds?.set ?? null;
    } finally {
      supportedInFlight = null;
    }
  })();
  return supportedInFlight;
}

/**
 * Checks many domains at once. Returns an answer for every domain Vercel could
 * vouch for; domains missing from the map (unsupported TLD, request failure)
 * should be checked another way. Never throws.
 */
export async function checkWithVercel(domains: string[]): Promise<Map<string, RegistrarAnswer>> {
  const answers = new Map<string, RegistrarAnswer>();
  // Kill switch: forces every lookup down the RDAP/WHOIS/DNS fallback chain.
  if (domains.length === 0 || process.env.DOMAA_DISABLE_REGISTRAR_API === "1") return answers;

  const supported = await getSupportedTlds();
  if (!supported) return answers;

  const eligible = domains.filter((d) => supported.has(d.slice(d.indexOf(".") + 1)));
  const chunks: string[][] = [];
  for (let i = 0; i < eligible.length; i += MAX_PER_REQUEST) {
    chunks.push(eligible.slice(i, i + MAX_PER_REQUEST));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const results = (await searchChunk(chunk)) ?? (await searchChunk(chunk));
      for (const r of results ?? []) {
        // Quotes cover `years` (2 for .ai's minimum term); store per-year.
        const years = typeof r.years === "number" && r.years > 0 ? r.years : 1;
        const perYear = (v: unknown) =>
          r.available && typeof v === "number" ? Math.round((v / years) * 100) / 100 : null;
        answers.set(r.domain.toLowerCase(), {
          available: r.available,
          priceUsd: perYear(r.price),
          renewalPriceUsd: perYear(r.renewalPrice),
          premium: r.premium === true,
          minYears: years,
        });
      }
    }),
  );

  return answers;
}

async function searchChunk(domains: string[]): Promise<SearchResult[] | null> {
  try {
    const res = await fetchWithTimeout(
      `${API}/domains/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
      },
      REQUEST_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const results = (body as { results?: unknown })?.results;
    if (!Array.isArray(results)) return null;
    return results.filter(
      (r): r is SearchResult =>
        typeof r?.domain === "string" && typeof r?.available === "boolean",
    );
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
