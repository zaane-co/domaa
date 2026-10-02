const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^[a-z]{2,63}(?:\.[a-z]{2,63})?$/;

export interface ParsedDomain {
  name: string;
  tld: string;
}

// Recognizes input that is already a domain ("domaa.com", "https://www.domaa.com/about")
// as opposed to keywords to combine ("sunrise bakery"). Returns null for
// anything that isn't a single label plus an extension. Supports two-part
// extensions such as "com.ng" or "co.uk".
export function parseDomainInput(input: string): ParsedDomain | null {
  let value = input.trim().toLowerCase();
  if (!value || /\s/.test(value)) return null;

  value = value
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");

  const dot = value.indexOf(".");
  if (dot <= 0) return null;

  const name = value.slice(0, dot);
  const tld = value.slice(dot + 1);
  if (!LABEL_RE.test(name) || !TLD_RE.test(tld)) return null;

  return { name, tld };
}
