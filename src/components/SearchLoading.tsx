"use client";

import { useEffect, useState } from "react";
import { parseDomainInput } from "@/lib/parseDomain";

const STEP_MS = 1400;
const TLD_TICK_MS = 260;
const SKELETON_ROWS = 4;

interface SearchLoadingProps {
  query: string;
  tlds: string[];
}

// Shown while a search runs. The steps mirror the real pipeline (generate
// names, batch availability check, pricing) and advance on a timer, holding on
// the last step until results arrive. Skeleton rows match DomainResultCard so
// the layout doesn't jump when results land.
export function SearchLoading({ query, tlds }: SearchLoadingProps) {
  const [step, setStep] = useState(0);
  const [tick, setTick] = useState(0);

  const typed = parseDomainInput(query);
  const steps = [
    typed ? `Checking ${typed.name}.${typed.tld}` : "Combining your words into names",
    `Checking ${tlds.length} extension${tlds.length === 1 ? "" : "s"}`,
    "Getting live prices",
  ];

  useEffect(() => {
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), STEP_MS);
    const tickTimer = setInterval(() => setTick((t) => t + 1), TLD_TICK_MS);
    return () => {
      clearInterval(stepTimer);
      clearInterval(tickTimer);
    };
  }, [steps.length]);

  return (
    <div className="flex flex-col gap-8" role="status" aria-live="polite">
      <div className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <ol className="flex flex-col gap-3">
          {steps.map((label, i) => {
            const state = i < step ? "done" : i === step ? "active" : "pending";
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <StepIcon state={state} />
                <span
                  className={
                    state === "active" ? "text-ink" : state === "done" ? "text-muted" : "text-muted/50"
                  }
                >
                  {label}
                  {state === "active" && <span className="loading-dots" aria-hidden />}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-2 pl-8">
          {tlds.map((tld, i) => {
            const lit = step >= 1 && (step > 1 || i <= tick % (tlds.length + 2));
            return (
              <span
                key={tld}
                className={`rounded-full border px-3 py-1 text-xs transition-colors duration-300 ${
                  lit ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-muted"
                }`}
              >
                .{tld}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4"
            style={{ opacity: 1 - i * 0.2 }}
          >
            <div className="flex flex-col gap-2.5">
              <div className="skeleton h-4 w-44 rounded-full" />
              <div className="flex gap-2">
                <div className="skeleton h-4 w-16 rounded-full" />
                <div className="skeleton h-4 w-24 rounded-full" />
              </div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <div className="skeleton h-8 w-32 rounded-full" />
              <div className="skeleton h-8 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-ink">
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2.5 6.5l2.2 2.2L9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return <span className="spinner h-5 w-5" />;
  }
  return <span className="h-5 w-5 rounded-full border border-line" />;
}
