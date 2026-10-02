"use client";

import { useState } from "react";
import type { DomainCheckResult } from "@/lib/types";
import { CURATED_TLDS } from "@/lib/rdap/tlds";
import { DomainResultCard } from "@/components/DomainResultCard";
import { ExactMatchCard } from "@/components/ExactMatchCard";
import { DEFAULT_FILTERS, ResultsFilters, applyFilters, type Filters } from "@/components/ResultsFilters";

const INITIAL_VISIBLE = 12;

export function ResultsList({
  results,
  exact,
}: {
  results: DomainCheckResult[];
  exact?: DomainCheckResult;
}) {
  const [showTaken, setShowTaken] = useState(false);
  const [showAllAvailable, setShowAllAvailable] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const allAvailable = results.filter((r) => r.availability === "available");
  const available = applyFilters(allAvailable, filters);
  const unknown = applyFilters(
    results.filter((r) => r.availability === "unknown"),
    filters,
  );
  const taken = applyFilters(
    results.filter((r) => r.availability === "registered"),
    filters,
  );

  // Every extension in the results, in the picker's order (.com first), with
  // how many available names each has.
  const counts = new Map<string, number>();
  for (const r of results) counts.set(r.tld, counts.get(r.tld) ?? 0);
  for (const r of allAvailable) counts.set(r.tld, (counts.get(r.tld) ?? 0) + 1);
  const order = (tld: string) => {
    const i = (CURATED_TLDS as readonly string[]).indexOf(tld);
    return i === -1 ? Infinity : i;
  };
  const tldCounts = [...counts].sort(([a], [b]) => order(a) - order(b));

  const isFiltered =
    filters.tlds.size > 0 || filters.nameQuery.trim() !== "" || filters.noHyphens;

  if (results.length === 0 && !exact) {
    return (
      <p className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-muted">
        No results. Try different words or a different name.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {exact && <ExactMatchCard result={exact} />}

      {results.length > 0 && (
        <ResultsFilters
          filters={filters}
          onChange={setFilters}
          tldCounts={tldCounts}
          totalAvailable={allAvailable.length}
        />
      )}

      {available.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-normal tracking-tight">
            {exact ? "Similar names you can grab" : "Here\u2019s what you can grab"}{" "}
            <span className="text-muted">
              ({isFiltered ? `${available.length} of ${allAvailable.length}` : available.length})
            </span>
          </h2>
          <div className="grid gap-2">
            {(showAllAvailable ? available : available.slice(0, INITIAL_VISIBLE)).map((r) => (
              <DomainResultCard key={r.domain} result={r} />
            ))}
          </div>
          {available.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAllAvailable((v) => !v)}
              className="w-fit rounded-full border border-line bg-surface px-5 py-2 text-sm transition hover:border-muted"
            >
              {showAllAvailable ? "Show fewer" : `Show all ${available.length} available`}
            </button>
          )}
        </section>
      ) : isFiltered && allAvailable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-muted">
          No available names match these filters.
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="rounded-full bg-white px-3 py-1 text-xs text-black"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <p className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-muted">
          Every name we tried is taken. Try different words or add more extensions.
        </p>
      )}

      {unknown.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-normal tracking-tight">
              Couldn&apos;t confirm <span className="text-muted">({unknown.length})</span>
            </h2>
            <p className="text-sm text-muted">
              We couldn&apos;t get a definite answer for these. Check them at a registrar.
            </p>
          </div>
          <div className="grid gap-2">
            {unknown.map((r) => (
              <DomainResultCard key={r.domain} result={r} />
            ))}
          </div>
        </section>
      )}

      {taken.length > 0 && (
        <section className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setShowTaken((v) => !v)}
            className="w-fit text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            {showTaken ? "Hide" : "Show"} already taken ({taken.length})
          </button>
          {showTaken && (
            <div className="grid gap-2">
              {taken.map((r) => (
                <DomainResultCard key={r.domain} result={r} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
