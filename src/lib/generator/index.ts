import type { Candidate, CandidateSource } from "@/lib/types";
import { PREFIXES, STOPWORDS, SUFFIXES, SYNONYMS } from "@/lib/generator/wordlists";

const LABEL_RE = /^[a-z0-9-]+$/;
const MIN_LENGTH = 3;
const SOFT_MAX_LENGTH = 25;
const MAX_CANDIDATES = 15;

const SOURCE_PRIORITY: Record<CandidateSource, number> = {
  exact: 0,
  prefix: 1,
  suffix: 1,
  synonym: 2,
  compound: 2,
  stylized: 3,
};

function normalize(keyword: string): string[] {
  const cleaned = keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length <= 1) return tokens;

  const withoutStopwords = tokens.filter((t) => !STOPWORDS.has(t));
  return withoutStopwords.length > 0 ? withoutStopwords : tokens;
}

function isValidLabel(label: string): boolean {
  if (!LABEL_RE.test(label)) return false;
  if (label.startsWith("-") || label.endsWith("-")) return false;
  if (label.length < MIN_LENGTH) return false;
  return true;
}

function addCandidate(
  set: Map<string, Candidate>,
  name: string,
  source: CandidateSource,
): void {
  if (!isValidLabel(name)) return;
  if (set.has(name)) return; // first (highest-priority) source wins
  set.set(name, { name, source, hasHyphen: name.includes("-") });
}

export function generateCandidates(keyword: string): Candidate[] {
  const tokens = normalize(keyword);
  if (tokens.length === 0) return [];

  const candidates = new Map<string, Candidate>();

  const join = tokens.join("");
  const hyphenJoin = tokens.join("-");
  addCandidate(candidates, join, "exact");
  addCandidate(candidates, hyphenJoin, "exact");

  const baseForms = new Set<string>([join]);

  if (tokens.length >= 3) {
    // Drop the least distinctive (shortest) word.
    const shortestIndex = tokens.reduce(
      (minIdx, t, i, arr) => (t.length < arr[minIdx].length ? i : minIdx),
      0,
    );
    const dropped = tokens.filter((_, i) => i !== shortestIndex).join("");
    addCandidate(candidates, dropped, "compound");
    baseForms.add(dropped);

    const acronym = tokens.map((t) => t[0]).join("");
    addCandidate(candidates, acronym, "compound");
  }

  if (tokens.length >= 2) {
    const reversed = [...tokens].reverse().join("");
    addCandidate(candidates, reversed, "compound");
    baseForms.add(reversed);
  }

  for (const base of baseForms) {
    for (const prefix of PREFIXES) {
      addCandidate(candidates, `${prefix}${base}`, "prefix");
    }
    for (const suffix of SUFFIXES) {
      addCandidate(candidates, `${base}${suffix}`, "suffix");
    }

    // Naive plural/singular toggle.
    if (base.endsWith("s")) {
      addCandidate(candidates, base.slice(0, -1), "compound");
    } else {
      addCandidate(candidates, `${base}s`, "compound");
    }

    // Vowel-dropped stylized variant.
    const stylized = base.replace(/[aeiou]/g, "");
    if (stylized.length >= MIN_LENGTH) {
      addCandidate(candidates, stylized, "stylized");
    }
  }

  // Synonym substitution: swap one token at a time, not a full cross-product.
  for (let i = 0; i < tokens.length; i++) {
    const synonyms = SYNONYMS[tokens[i]];
    if (!synonyms) continue;

    for (const synonym of synonyms) {
      const swapped = tokens.map((t, idx) => (idx === i ? synonym : t)).join("");
      addCandidate(candidates, swapped, "synonym");

      for (const prefix of PREFIXES) {
        addCandidate(candidates, `${prefix}${swapped}`, "synonym");
      }
      for (const suffix of SUFFIXES) {
        addCandidate(candidates, `${swapped}${suffix}`, "synonym");
      }
    }
  }

  const ranked = Array.from(candidates.values()).sort((a, b) => {
    const aOverLength = a.name.length > SOFT_MAX_LENGTH;
    const bOverLength = b.name.length > SOFT_MAX_LENGTH;
    if (aOverLength !== bOverLength) return aOverLength ? 1 : -1;

    const priorityDiff = SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.hasHyphen !== b.hasHyphen) return a.hasHyphen ? 1 : -1;

    return a.name.length - b.name.length;
  });

  return ranked.slice(0, MAX_CANDIDATES);
}
