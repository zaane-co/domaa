"use client";

import BorderGlow from "@/components/BorderGlow";
import { ExtensionPicker } from "@/components/ExtensionPicker";
import type { CuratedTld } from "@/lib/rdap/tlds";

const PINNED_TLDS = ["com", "dev", "app"] as const;

interface SearchBoxProps {
  variant: "hero" | "sidebar";
  options: readonly CuratedTld[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
  selected: Set<string>;
  onToggleTld: (tld: string) => void;
  onSetTlds: (tlds: string[]) => void;
  loading: boolean;
  canSearch: boolean;
  onSubmit: () => void;
}

// The glowing search box. Rendered centered in the hero and compact in the
// workspace sidebar; both carry the same view-transition-name so the browser
// morphs one into the other when a search starts.
export function SearchBox({
  variant,
  options,
  keyword,
  onKeywordChange,
  maxPrice,
  onMaxPriceChange,
  selected,
  onToggleTld,
  onSetTlds,
  loading,
  canSearch,
  onSubmit,
}: SearchBoxProps) {
  const isHero = variant === "hero";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <BorderGlow
      className={`pointer-events-auto w-full ${isHero ? "mt-12 max-w-3xl" : ""}`}
      edgeSensitivity={30}
      glowColor="40 80 80"
      backgroundColor="#dde5f3"
      borderRadius={isHero ? 28 : 24}
      glowRadius={40}
      glowIntensity={1.0}
      coneSpread={25}
      animated={false}
      loop
      loopDuration={5}
      colors={["#c084fc", "#f472b6", "#38bdf8"]}
      style={{ viewTransitionName: "search-box" }}
    >
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col text-left ${
          isHero ? "gap-6 rounded-[28px] p-4 sm:p-5" : "gap-4 rounded-[24px] p-4"
        }`}
      >
        <label htmlFor="search" className="sr-only">
          Name, keywords, or domain
        </label>
        <textarea
          id="search"
          rows={isHero ? 3 : 2}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
          placeholder={
            isHero
              ? "Enter a name or a few keywords, e.g. sunrise bakery or domaa.com"
              : "Search another name or domain"
          }
          className="w-full resize-none bg-transparent px-1 text-base text-slate-900 outline-none placeholder:text-slate-500"
        />

        <div
          className={
            isHero
              ? "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
              : "flex flex-col gap-3"
          }
        >
          <div className="flex flex-wrap gap-2">
            <ExtensionPicker
              options={options}
              pinned={PINNED_TLDS}
              selected={selected}
              onToggle={onToggleTld}
              onSetAll={onSetTlds}
            />
            <label className="flex items-center gap-1.5 rounded-full border border-white bg-white px-3.5 py-1.5 text-xs text-slate-600">
              Max $
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                placeholder="any"
                aria-label="Maximum price per year in dollars"
                className="w-10 appearance-none bg-transparent text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
              /yr
            </label>
          </div>

          <button
            type="submit"
            disabled={!canSearch}
            className={`shrink-0 rounded-full bg-gradient-to-b from-[#1b1a26] to-[#0b0b12] px-6 py-2.5 text-sm text-white shadow-lg transition hover:from-[#2a2840] hover:to-[#14131f] ${
              isHero ? "" : "w-full"
            } ${loading ? "disabled:cursor-wait" : "disabled:cursor-not-allowed disabled:opacity-50"}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner h-3.5 w-3.5 border-white/30 border-t-white" />
                Checking
              </span>
            ) : (
              "Find domains"
            )}
          </button>
        </div>
      </form>
    </BorderGlow>
  );
}
