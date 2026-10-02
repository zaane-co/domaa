import type { DomainCheckResult } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PriceTag } from "@/components/PriceTag";

const HEADLINES: Record<DomainCheckResult["availability"], string> = {
  available: "is available",
  registered: "is taken",
  unknown: "couldn't be confirmed",
};

// The domain the user typed, shown above the suggestions.
export function ExactMatchCard({ result }: { result: DomainCheckResult }) {
  const isAvailable = result.availability === "available";

  let note: string;
  if (result.unsupportedTld) {
    note = `We can't check .${result.tld} domains automatically. Check it at a registrar, or pick one of the names below.`;
  } else if (isAvailable && result.premium) {
    note = "It's a premium name, so the registry charges more than the standard rate.";
  } else if (isAvailable) {
    note = "Grab it before someone else does.";
  } else if (result.availability === "registered") {
    note = "Someone already owns it. Here are similar names you can register.";
  } else {
    note = "We couldn't get a definite answer. Check it at a registrar.";
  }

  return (
    <section
      className={`flex flex-col gap-5 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 ${
        isAvailable ? "border-accent bg-surface-2" : "border-line bg-surface"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge availability={result.availability} />
          <PriceTag result={result} />
        </div>
        <h2 className="break-all text-3xl font-normal tracking-tight sm:text-4xl">
          {result.name}
          <span className="text-muted">.{result.tld}</span>
        </h2>
        <p className="text-sm text-muted">
          <span className="text-ink">{result.domain}</span> {HEADLINES[result.availability]}. {note}
        </p>
      </div>

      {result.availability !== "registered" && (
        <div className="flex shrink-0 gap-2">
          <a
            href={result.buyLinks.namecheap}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg transition hover:bg-white"
          >
            {isAvailable ? "Buy on Namecheap" : "Check on Namecheap"}
          </a>
          <a
            href={result.buyLinks.godaddy}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium transition hover:border-muted"
          >
            GoDaddy
          </a>
        </div>
      )}
    </section>
  );
}
