export type CandidateSource =
  | "exact"
  | "prefix"
  | "suffix"
  | "synonym"
  | "compound"
  | "stylized";

export interface Candidate {
  name: string;
  source: CandidateSource;
  hasHyphen: boolean;
}

export type Availability = "available" | "registered" | "unknown";

export interface DomainCheckResult {
  name: string;
  tld: string;
  domain: string;
  availability: Availability;
  /** First-year price in USD: the registrar's quote, or a typical-price estimate. */
  priceUsd: number | null;
  renewalPriceUsd: number | null;
  /** True when priceUsd comes from the static table, not a registrar quote. */
  priceIsEstimate: boolean;
  /** Registry-designated premium name, priced above the standard rate. */
  premium: boolean;
  /** Minimum registration term in years; prices above are per year. */
  minYears: number;
  /** Generator relevance: lower is a closer match to what the user typed. */
  rank: number;
  buyLinks: {
    namecheap: string;
    godaddy: string;
  };
  /** No source (registrar API, RDAP, WHOIS) can check this extension at all. */
  unsupportedTld?: boolean;
}

export interface SearchRequestBody {
  keyword: string;
  maxPricePerYear?: number;
  tlds?: string[];
}

export interface SearchResponseBody {
  /** Set when the user typed a full domain: that exact domain, checked first. */
  exact?: DomainCheckResult;
  results: DomainCheckResult[];
}
