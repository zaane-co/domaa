"use client";

export type SortMode = "best" | "cheapest" | "shortest";

export interface Filters {
  /** Empty means every extension. */
  tlds: Set<string>;
  sort: SortMode;
  nameQuery: string;
  noHyphens: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  tlds: new Set(),
  sort: "best",
  nameQuery: "",
  noHyphens: false,
};

const SORTS: { value: SortMode; label: string }[] = [
  { value: "best", label: "Best match" },
  { value: "cheapest", label: "Cheapest" },
  { value: "shortest", label: "Shortest" },
];

interface ResultsFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  /** Available-name count per extension, in display order. */
  tldCounts: [string, number][];
  totalAvailable: number;
}

// Sticky toolbar above the results. Everything here filters client-side;
// nothing triggers a new search.
export function ResultsFilters({ filters, onChange, tldCounts, totalAvailable }: ResultsFiltersProps) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  function toggleTld(tld: string) {
    const next = new Set(filters.tlds);
    if (next.has(tld)) next.delete(tld);
    else next.add(tld);
    // Selecting every extension is the same as "All".
    set({ tlds: next.size === tldCounts.length ? new Set() : next });
  }

  const allActive = filters.tlds.size === 0;

  return (
    <div className="sticky top-0 z-10 -mx-5 flex flex-col gap-3 border-b border-white/10 bg-[#05060b] px-5 py-4 sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by extension">
        <Chip active={allActive} onClick={() => set({ tlds: new Set() })}>
          All <Count active={allActive}>{totalAvailable}</Count>
        </Chip>
        {tldCounts.map(([tld, count]) => {
          const active = filters.tlds.has(tld);
          return (
            <Chip key={tld} active={active} onClick={() => toggleTld(tld)} disabled={count === 0}>
              .{tld} <Count active={active}>{count}</Count>
            </Chip>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-line bg-surface p-0.5" role="group" aria-label="Sort">
          {SORTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set({ sort: s.value })}
              aria-pressed={filters.sort === s.value}
              className={`rounded-full px-3 py-1 text-xs transition ${
                filters.sort === s.value ? "bg-white text-black" : "text-muted hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs sm:max-w-56">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={filters.nameQuery}
            onChange={(e) => set({ nameQuery: e.target.value })}
            placeholder="Filter names"
            aria-label="Filter names containing"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
          />
        </label>

        <button
          type="button"
          onClick={() => set({ noHyphens: !filters.noHyphens })}
          aria-pressed={filters.noHyphens}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            filters.noHyphens ? "border-white bg-white text-black" : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          No hyphens
        </button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-white bg-white text-black" : "border-line bg-surface text-ink hover:border-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={active ? "text-black/60" : "text-muted"}>{children}</span>;
}

/** Applies filters and sorting to one result group. */
export function applyFilters<
  T extends { tld: string; name: string; rank: number; priceUsd: number | null; premium: boolean },
>(items: T[], filters: Filters): T[] {
  const query = filters.nameQuery.trim().toLowerCase().replace(/^\./, "");
  const filtered = items.filter(
    (r) =>
      (filters.tlds.size === 0 || filters.tlds.has(r.tld)) &&
      (!filters.noHyphens || !r.name.includes("-")) &&
      (!query || r.name.includes(query)),
  );

  const byMode = {
    best: (a: T, b: T) => a.rank - b.rank,
    cheapest: (a: T, b: T) => (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity) || a.rank - b.rank,
    shortest: (a: T, b: T) => a.name.length - b.name.length || a.rank - b.rank,
  }[filters.sort];

  // Premium names are real but rarely wanted at their price: keep them last
  // whatever the sort.
  return [...filtered].sort((a, b) => Number(a.premium) - Number(b.premium) || byMode(a, b));
}
