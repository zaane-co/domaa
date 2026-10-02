"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { DomainCheckResult, SearchResponseBody } from "@/lib/types";
import { CURATED_TLDS, DEFAULT_TLDS, PRICE_DISCLAIMER } from "@/lib/rdap/tlds";
import { ResultsList } from "@/components/ResultsList";
import { Wordmark } from "@/components/Wordmark";
import { HeroBackground } from "@/components/HeroBackground";
import { SearchBox } from "@/components/SearchBox";
import { SearchLoading } from "@/components/SearchLoading";

// Every curated extension is checkable: the registrar API covers all of them,
// with RDAP/WHOIS as fallback (WHOIS is what covers .io/.co/.me).
const PICKABLE_TLDS = CURATED_TLDS;
const RECENTS_KEY = "domaa:recent-searches";
const MAX_RECENTS = 8;

interface SearchParams {
  query: string;
  tlds: string[];
  maxPrice: string;
}

function loadRecents(): SearchParams[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as SearchParams[]).slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function saveRecents(recents: SearchParams[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // Private mode / blocked storage: recents just won't persist.
  }
}

// Morphs between layouts with the View Transitions API where available
// (the search box shares a view-transition-name across both layouts).
function withViewTransition(update: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduceMotion) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

// Two layouts over one state: a centered hero until the first search, then a
// workspace with the search box in a left sidebar and results on the right.
export function SearchForm() {
  const [keyword, setKeyword] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(DEFAULT_TLDS));
  const [workspace, setWorkspace] = useState(false);
  const [results, setResults] = useState<DomainCheckResult[] | null>(null);
  const [exact, setExact] = useState<DomainCheckResult | undefined>();
  const [loading, setLoading] = useState(false);
  // The search currently shown (loading or finished), for headings and the loader.
  const [active, setActive] = useState<SearchParams | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only rendered in the workspace, which never exists during SSR, so reading
  // localStorage in the initializer can't cause a hydration mismatch.
  const [recents, setRecents] = useState<SearchParams[]>(loadRecents);
  const resultsPaneRef = useRef<HTMLElement>(null);
  const requestId = useRef(0);

  const canSearch = !loading && keyword.trim().length > 0 && selected.size > 0;

  function toggleTld(tld: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tld)) next.delete(tld);
      else next.add(tld);
      return next;
    });
  }

  function currentParams(): SearchParams {
    return {
      query: keyword.trim(),
      tlds: PICKABLE_TLDS.filter((tld) => selected.has(tld)),
      maxPrice,
    };
  }

  async function runSearch(params: SearchParams) {
    if (!params.query || params.tlds.length === 0) return;
    const id = ++requestId.current;

    const start = () => {
      setWorkspace(true);
      setLoading(true);
      setActive(params);
      setError(null);
      setResults(null);
      setExact(undefined);
    };
    if (workspace) start();
    else withViewTransition(start);

    resultsPaneRef.current?.scrollTo({ top: 0 });
    // On small screens the panes stack, so bring the results into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        resultsPaneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }

    setRecents((prev) => {
      const next = [params, ...prev.filter((r) => r.query !== params.query)].slice(0, MAX_RECENTS);
      saveRecents(next);
      return next;
    });

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: params.query,
          maxPricePerYear: params.maxPrice ? Number(params.maxPrice) : undefined,
          tlds: params.tlds,
        }),
      });
      if (id !== requestId.current) return;

      if (res.status === 429) {
        setError("Too many searches. Please wait a few minutes and try again.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      const data: SearchResponseBody = await res.json();
      if (id !== requestId.current) return;
      setExact(data.exact);
      setResults(data.results);
    } catch {
      if (id === requestId.current) setError("Something went wrong. Please try again.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function runRecent(recent: SearchParams) {
    setKeyword(recent.query);
    setMaxPrice(recent.maxPrice);
    setSelected(new Set(recent.tlds));
    runSearch(recent);
  }

  function reset() {
    requestId.current++;
    withViewTransition(() => {
      setWorkspace(false);
      setLoading(false);
      setActive(null);
      setResults(null);
      setExact(undefined);
      setError(null);
      setKeyword("");
    });
  }

  const searchBox = (variant: "hero" | "sidebar") => (
    <SearchBox
      variant={variant}
      options={PICKABLE_TLDS}
      keyword={keyword}
      onKeywordChange={setKeyword}
      maxPrice={maxPrice}
      onMaxPriceChange={setMaxPrice}
      selected={selected}
      onToggleTld={toggleTld}
      onSetTlds={(tlds) => setSelected(new Set(tlds))}
      loading={loading}
      canSearch={canSearch}
      onSubmit={() => canSearch && runSearch(currentParams())}
    />
  );

  return (
    <div className="relative isolate flex min-h-[100svh] flex-col overflow-x-clip bg-black lg:h-[100svh] lg:overflow-hidden">
      <HeroBackground />

      {workspace ? (
        <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:grid lg:min-h-0 lg:grid-cols-[400px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="flex flex-col gap-5 lg:min-h-0">
            <div className="flex items-center justify-between px-2 pt-2">
              <button
                type="button"
                onClick={reset}
                aria-label="Domaa home"
                className="text-white"
                style={{ viewTransitionName: "logo" }}
              >
                <Wordmark className="text-lg" />
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs text-white/80 transition hover:border-white/50 hover:text-white"
              >
                New search
              </button>
            </div>

            {searchBox("sidebar")}

            {recents.length > 0 && (
              <nav className="hidden min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 lg:flex" aria-label="Recent searches">
                <span className="px-2 pb-1 text-xs uppercase tracking-wider text-white/40">Recent</span>
                {recents.map((recent) => {
                  const isActive = active?.query === recent.query;
                  return (
                    <button
                      key={recent.query}
                      type="button"
                      onClick={() => runRecent(recent)}
                      disabled={loading}
                      className={`truncate rounded-xl px-3 py-2 text-left text-sm transition disabled:cursor-wait ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {recent.query}
                    </button>
                  );
                })}
              </nav>
            )}

            <p className="mt-auto hidden px-2 pb-1 text-xs text-white/40 lg:block">
              Checked live with the official registries
            </p>
          </aside>

          {/* Results */}
          <section
            ref={resultsPaneRef}
            aria-label="Results"
            className="animate-results-in scroll-mt-3 rounded-3xl border border-white/10 bg-[#05060b]/90 lg:min-h-0 lg:overflow-y-auto"
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10">
              {active && (
                <header className="flex flex-col gap-1">
                  <h1 className="text-2xl font-normal tracking-tight text-white sm:text-3xl">
                    {active.query}
                  </h1>
                  <p className="text-sm text-muted">
                    {active.tlds.length} extension{active.tlds.length === 1 ? "" : "s"}
                    {active.maxPrice ? ` · up to $${active.maxPrice}/yr` : ""}
                  </p>
                </header>
              )}

              {loading && active && <SearchLoading query={active.query} tlds={active.tlds} />}

              {error && (
                <p className="rounded-2xl bg-[#7f1d1d] px-5 py-4 text-sm text-white">{error}</p>
              )}

              {results && <ResultsList results={results} exact={exact} />}

              {results && results.length > 0 && (
                <p className="text-xs text-muted">{PRICE_DISCLAIMER}</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <>
          <header className="relative z-10">
            <nav className="mx-auto flex max-w-6xl items-center px-4 py-6 sm:px-8">
              <span className="text-white" style={{ viewTransitionName: "logo" }}>
                <Wordmark className="text-lg" />
              </span>
            </nav>
          </header>

          <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-32 pt-10 text-center sm:px-8">
            <h1 className="text-5xl font-normal leading-[1.05] tracking-tight text-white sm:text-7xl">
              Domains you can actually buy
            </h1>
            <p className="mt-5 max-w-md text-sm text-white/60 sm:text-base">
              Type a name, a few keywords, or a full domain. Domaa finds versions that are free to
              register.
            </p>

            {searchBox("hero")}
          </div>

          <p className="pointer-events-none relative z-10 pb-8 text-center text-sm text-white/60">
            <span className="mr-2 inline-block h-1 w-1 rounded-full bg-white/60 align-middle" />
            Checked live with the official registries
          </p>
        </>
      )}
    </div>
  );
}
