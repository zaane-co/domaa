// Curated allowlist of extensions offered in the picker. All are checked via
// the registrar API (lib/availability/vercel.ts), with RDAP/WHOIS/DNS as the
// fallback chain (lib/rdap/client.ts).
export const CURATED_TLDS = [
  "com",
  "net",
  "org",
  "io",
  "co",
  "ai",
  "dev",
  "app",
  "xyz",
  "me",
  "info",
  "biz",
  "tech",
  "store",
  "online",
  "site",
  "shop",
  "cloud",
] as const;

export type CuratedTld = (typeof CURATED_TLDS)[number];

// Smaller subset selected by default in the picker.
export const DEFAULT_TLDS: CuratedTld[] = [
  "com",
  "dev",
  "app",
  "xyz",
  "online",
  "org",
  "tech",
  "info",
];

// Approximate registrar price per year, in USD. Only shown when the registrar
// API didn't return a real quote, and always labelled as an estimate.
// First-year price per year, from Vercel's registrar on 2026-10-01 (.ai is
// quoted for its 2-year minimum, $160, so $80/yr here).
export const PRICE_TABLE: Record<CuratedTld, number> = {
  com: 11.25,
  net: 13.5,
  org: 8.49,
  io: 14.99,
  co: 29.99,
  ai: 80,
  dev: 13,
  app: 14.99,
  xyz: 1.99,
  me: 13.99,
  info: 5.99,
  biz: 11.99,
  tech: 7.99,
  store: 1.99,
  online: 1.99,
  site: 1.99,
  shop: 2.99,
  cloud: 7.99,
};

export const PRICE_DISCLAIMER =
  "Prices are first-year registration quotes from a live registrar check and can differ slightly between registrars. Confirm at checkout.";

export function isCuratedTld(value: string): value is CuratedTld {
  return (CURATED_TLDS as readonly string[]).includes(value);
}
