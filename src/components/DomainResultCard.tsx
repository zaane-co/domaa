import type { DomainCheckResult } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PriceTag } from "@/components/PriceTag";

export function DomainResultCard({ result }: { result: DomainCheckResult }) {
  const isAvailable = result.availability === "available";

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
        isAvailable ? "border-line bg-surface-2" : "border-line bg-surface opacity-70"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="truncate text-base font-medium">
          {result.name}
          <span className="text-muted">.{result.tld}</span>
        </span>
        <div className="flex items-center gap-2">
          <StatusBadge availability={result.availability} />
          <PriceTag result={result} />
        </div>
      </div>

      {isAvailable && (
        <div className="flex shrink-0 gap-2">
          <a
            href={result.buyLinks.namecheap}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-bg transition hover:bg-white"
          >
            Buy on Namecheap
          </a>
          <a
            href={result.buyLinks.godaddy}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium transition hover:border-muted"
          >
            Buy on GoDaddy
          </a>
        </div>
      )}
    </div>
  );
}
