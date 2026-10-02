import { NextRequest } from "next/server";
import { z } from "zod";
import { generateCandidates } from "@/lib/generator";
import { checkWithVercel, type RegistrarAnswer } from "@/lib/availability/vercel";
import { hasWhoisServer } from "@/lib/availability/whois";
import { checkDomainAvailability, hasRdapSupport, type CheckOptions } from "@/lib/rdap/client";
import { getCached, setCached } from "@/lib/rdap/cache";
import { mapWithConcurrency } from "@/lib/rdap/concurrency";
import { CURATED_TLDS, DEFAULT_TLDS, PRICE_TABLE, isCuratedTld } from "@/lib/rdap/tlds";
import { buildGodaddyUrl, buildNamecheapUrl } from "@/lib/registrarLinks";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { parseDomainInput } from "@/lib/parseDomain";
import type { DomainCheckResult, SearchResponseBody } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const FALLBACK_CONCURRENCY = 25;
const MAX_NAME_CANDIDATES = 13;
// Stop starting fallback retries this long after the request begins, leaving
// headroom under maxDuration (30s) for in-flight attempts to finish.
const RETRY_BUDGET_MS = 18_000;
// The domain the user typed matters most: longer timeout, more retries.
const EXACT_CHECK: CheckOptions = { timeoutMs: 5000, attempts: 4 };

const requestSchema = z.object({
  keyword: z.string().min(1).max(100),
  maxPricePerYear: z.number().positive().max(10000).optional(),
  tlds: z.array(z.string()).max(CURATED_TLDS.length).optional(),
});

type Target = { name: string; tld: string; domain: string; rank: number };

export async function POST(request: NextRequest) {
  const deadline = Date.now() + RETRY_BUDGET_MS;
  const ip = getClientIp(request.headers);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { keyword, maxPricePerYear, tlds } = parsed.data;

  const requestedTlds = tlds?.filter(isCuratedTld) ?? [];
  const tldsToCheck = requestedTlds.length > 0 ? requestedTlds : DEFAULT_TLDS;

  // A typed domain ("domaa.com") is checked as-is, and its name seeds the
  // suggestions. Anything else is treated as keywords to combine.
  const typed = parseDomainInput(keyword);
  const seed = typed ? typed.name : keyword;

  const candidates = generateCandidates(seed).slice(0, MAX_NAME_CANDIDATES);

  const exactTarget: Target | null = typed
    ? { ...typed, domain: `${typed.name}.${typed.tld}`, rank: -1 }
    : null;
  // Candidates come out of the generator best-first; that order (then the
  // user's extension order) is the "best match" ranking the UI can sort by.
  const targets: Target[] = candidates
    .flatMap((candidate) =>
      tldsToCheck.map((tld) => ({ name: candidate.name, tld, domain: `${candidate.name}.${tld}` })),
    )
    .map((t, rank) => ({ ...t, rank }))
    .filter((t) => t.domain !== exactTarget?.domain);

  // 1. Registrar API: one batched request for everything, real prices included.
  const allTargets = exactTarget ? [exactTarget, ...targets] : targets;
  const uncached = allTargets.filter((t) => {
    const hit = getCached(t.domain);
    return !hit || hit === "unknown";
  });
  const registrar = await checkWithVercel(uncached.map((t) => t.domain));
  for (const [domain, answer] of registrar) setCached(domain, answer);

  // 2. Anything the registrar couldn't vouch for goes through RDAP, WHOIS, DNS.
  const [exact, checked] = await Promise.all([
    exactTarget ? resolve(exactTarget, { ...EXACT_CHECK, deadline }) : Promise.resolve(undefined),
    mapWithConcurrency(targets, FALLBACK_CONCURRENCY, (t) => resolve(t, { deadline })),
  ]);

  const filtered =
    maxPricePerYear != null
      ? checked.filter((r) => r.priceUsd == null || r.priceUsd <= maxPricePerYear)
      : checked;

  const availabilityRank: Record<DomainCheckResult["availability"], number> = {
    available: 0,
    unknown: 1,
    registered: 2,
  };

  filtered.sort((a, b) => {
    const rankDiff = availabilityRank[a.availability] - availabilityRank[b.availability];
    if (rankDiff !== 0) return rankDiff;
    // Premium names are real but rarely what people want; keep them after
    // standard-priced ones.
    if (a.premium !== b.premium) return a.premium ? 1 : -1;
    return (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity);
  });

  const body: SearchResponseBody = { exact, results: filtered };
  return Response.json(body);
}

async function resolve(target: Target, options: CheckOptions): Promise<DomainCheckResult> {
  const { name, tld, domain } = target;
  const cached = getCached(domain);

  const answer: RegistrarAnswer | null = cached && typeof cached === "object" ? cached : null;
  let availability: DomainCheckResult["availability"];
  if (answer) {
    availability = answer.available ? "available" : "registered";
  } else if (typeof cached === "string") {
    availability = cached;
  } else {
    availability = await checkDomainAvailability(name, tld, options);
  }

  const estimate = isCuratedTld(tld) ? PRICE_TABLE[tld] : null;
  const hasQuote = answer?.priceUsd != null;

  const result: DomainCheckResult = {
    name,
    tld,
    domain,
    availability,
    priceUsd: hasQuote ? answer!.priceUsd : estimate,
    renewalPriceUsd: answer?.renewalPriceUsd ?? null,
    priceIsEstimate: !hasQuote,
    premium: answer?.premium ?? false,
    minYears: answer?.minYears ?? 1,
    rank: target.rank,
    buyLinks: {
      namecheap: buildNamecheapUrl(domain),
      godaddy: buildGodaddyUrl(domain),
    },
  };

  if (availability === "unknown" && !answer && !hasRdapSupport(tld) && !(await hasWhoisServer(tld))) {
    result.unsupportedTld = true;
  }
  return result;
}
