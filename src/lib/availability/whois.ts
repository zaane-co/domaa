import net from "node:net";
import type { Availability } from "@/lib/types";

// WHOIS (port 43) as a second free source behind RDAP. Registries rate-limit
// the two services separately, and some TLDs with no RDAP server (.io, .co,
// .me) still run WHOIS. Several registries have retired WHOIS since ICANN's
// RDAP transition (.dev/.app/.info have none, .shop retired May 2026); for
// those IANA returns no server and this resolves to "unknown".

const IANA_WHOIS = "whois.iana.org";
const TIMEOUT_MS = 4000;
const MAX_RESPONSE_BYTES = 64 * 1024;

// Verified 2026-10-01 against IANA. Anything not listed is looked up at IANA
// once and cached for the life of the process.
const KNOWN_SERVERS: Record<string, string | null> = {
  com: "whois.verisign-grs.com",
  net: "whois.verisign-grs.com",
  org: "whois.publicinterestregistry.org",
  io: "whois.nic.io",
  co: "whois.registry.co",
  me: "whois.nic.me",
  ai: "whois.nic.ai",
  biz: "whois.nic.biz",
  xyz: "whois.nic.xyz",
  online: "whois.nic.online",
  site: "whois.nic.site",
  store: "whois.nic.store",
  tech: "whois.nic.tech",
  cloud: "whois.nic.cloud",
  dev: null,
  app: null,
  info: null,
  shop: null,
};

const discovered = new Map<string, Promise<string | null>>();

// Checked before the "free" patterns so stray wording in a long record can't
// turn a registered domain into an available one.
const REGISTERED_RE = /^[ \t]*(domain name|registry domain id|registrar|creation date|created):[ \t]*\S/im;
const FREE_RE =
  /no match for|no data found|domain not found|not found:|no entries found|is available for registration|the queried object does not exist|^[ \t]*status:[ \t]*(free|available)\b/im;

export async function checkWithWhois(domain: string, tld: string): Promise<Availability> {
  const server = await whoisServerFor(tld);
  if (!server) return "unknown";

  const response = await query(server, domain);
  if (!response) return "unknown";
  if (REGISTERED_RE.test(response)) return "registered";
  if (FREE_RE.test(response)) return "available";
  // Rate-limit notices, retirement notices, anything unrecognised.
  return "unknown";
}

export async function hasWhoisServer(tld: string): Promise<boolean> {
  return (await whoisServerFor(tld)) != null;
}

function whoisServerFor(tld: string): Promise<string | null> {
  if (tld in KNOWN_SERVERS) return Promise.resolve(KNOWN_SERVERS[tld]);

  let pending = discovered.get(tld);
  if (!pending) {
    pending = query(IANA_WHOIS, tld).then((text) => {
      // [ \t] not \s: a blank "whois:" line must not capture the next line.
      const match = text?.match(/^whois:[ \t]*(\S+)/m);
      return match ? match[1] : null;
    });
    discovered.set(tld, pending);
  }
  return pending;
}

function query(host: string, q: string): Promise<string | null> {
  return new Promise((resolve) => {
    let data = "";
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    const socket = net.connect({ host, port: 43 }, () => socket.write(`${q}\r\n`));
    socket.setEncoding("utf8");
    socket.setTimeout(TIMEOUT_MS, () => finish(null));
    socket.on("data", (chunk: string) => {
      data += chunk;
      if (data.length > MAX_RESPONSE_BYTES) finish(data);
    });
    socket.on("end", () => finish(data));
    socket.on("error", () => finish(null));
  });
}
