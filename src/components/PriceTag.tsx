import type { DomainCheckResult } from "@/lib/types";

// Renewal counts as a "jump" worth flagging once it's well above the intro
// price (e.g. .shop: $2.99 first year, $38.39 after).
const RENEWAL_JUMP_RATIO = 1.25;

function formatUsd(value: number) {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function PriceTag({ result }: { result: DomainCheckResult }) {
  const { priceUsd, renewalPriceUsd, priceIsEstimate, premium, minYears, availability } = result;
  if (priceUsd == null || availability === "registered") return null;

  const showRenewal =
    !priceIsEstimate &&
    renewalPriceUsd != null &&
    renewalPriceUsd > priceUsd * RENEWAL_JUMP_RATIO;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      {premium && (
        <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 font-medium text-white">Premium</span>
      )}
      <span className={priceIsEstimate ? "" : "text-ink"}>
        {priceIsEstimate
          ? `about ${formatUsd(priceUsd)}/yr`
          : minYears > 1
            ? `${formatUsd(priceUsd)}/yr, ${minYears}-year minimum`
            : `${formatUsd(priceUsd)} first year`}
      </span>
      {showRenewal && <span>then {formatUsd(renewalPriceUsd)}/yr</span>}
    </span>
  );
}
