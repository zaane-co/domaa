// Run manually via `npm run gen:tlds` to refresh src/lib/rdap/tld-config.generated.ts.
// Not called at request time — runtime code only ever imports the generated file.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";

// Kept in sync by hand with src/lib/rdap/tlds.ts (that file is TS, this script
// runs standalone with plain Node, so the list is duplicated here on purpose).
const CURATED_TLDS = [
  "com",
  "net",
  "org",
  "io",
  "co",
  "ai",
  "dev",
  "app",
  "xyz",
  "me",
  "info",
  "biz",
  "tech",
  "store",
  "online",
  "site",
  "shop",
  "cloud",
];

async function main() {
  const res = await fetch(BOOTSTRAP_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch IANA RDAP bootstrap: HTTP ${res.status}`);
  }
  const bootstrap = await res.json();

  /** @type {Record<string, string>} */
  const baseUrls = {};
  const found = new Set();

  for (const [tlds, urls] of bootstrap.services ?? []) {
    for (const tld of tlds) {
      const normalized = tld.toLowerCase();
      if (CURATED_TLDS.includes(normalized) && urls?.length) {
        // Prefer an https URL if one is listed.
        const httpsUrl = urls.find((u) => u.startsWith("https://"));
        baseUrls[normalized] = httpsUrl ?? urls[0];
        found.add(normalized);
      }
    }
  }

  const missing = CURATED_TLDS.filter((t) => !found.has(t));
  if (missing.length) {
    console.warn(
      `[gen:tlds] No RDAP entry found for: ${missing.join(", ")} — they will not be checked at runtime.`,
    );
  }

  const sortedKeys = Object.keys(baseUrls).sort();
  const lines = sortedKeys.map((k) => `  ${k}: ${JSON.stringify(baseUrls[k])},`);

  const output = `// GENERATED FILE — do not edit by hand.
// Produced by scripts/generate-rdap-config.mjs on ${new Date().toISOString()}
// from ${BOOTSTRAP_URL}. Rerun \`npm run gen:tlds\` to refresh.

export const RDAP_BASE_URLS: Record<string, string> = {
${lines.join("\n")}
};
`;

  const outPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "src",
    "lib",
    "rdap",
    "tld-config.generated.ts",
  );
  await writeFile(outPath, output, "utf8");
  console.log(`[gen:tlds] Wrote ${sortedKeys.length} TLD entries to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
