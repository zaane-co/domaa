import type { Availability } from "@/lib/types";

const LABELS: Record<Availability, string> = {
  available: "Available",
  registered: "Taken",
  unknown: "Unconfirmed",
};

const COLORS: Record<Availability, string> = {
  available: "bg-accent text-accent-ink",
  registered: "bg-taken text-muted",
  unknown: "bg-unknown text-white",
};

export function StatusBadge({ availability }: { availability: Availability }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[availability]}`}
    >
      {LABELS[availability]}
    </span>
  );
}
