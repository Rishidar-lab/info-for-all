import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { badRequest } from "../errors";
import { env } from "../env";

/**
 * SSRF protection for ingestion. Ingestion may only reach public HTTP(S) hosts.
 * See docs/THREAT_MODEL.md.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "metadata.google.internal",
]);

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  if (normalized.startsWith("::ffff:")) {
    const v4 = normalized.slice("::ffff:".length);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true;
}

export interface SafeUrl {
  url: URL;
  resolvedAddresses: string[];
}

/**
 * Validate a URL for outbound ingestion. Rejects non-HTTP(S) schemes, embedded
 * credentials, non-standard ports, blocked hostnames, hosts outside the optional
 * allowlist, and any hostname that resolves to a private / loopback / link-local
 * address (unless INGEST_ALLOW_PRIVATE_NETWORK=true).
 */
export async function assertSafeUrl(rawUrl: string): Promise<SafeUrl> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw badRequest("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw badRequest(`Unsupported URL scheme: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw badRequest("URLs with embedded credentials are not allowed");
  }
  if (url.port && !["", "80", "443", "8080", "8443"].includes(url.port)) {
    throw badRequest(`Port ${url.port} is not allowed for ingestion`);
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw badRequest("Host is not permitted for ingestion");
  }

  if (env.ingestHostAllowlist.length > 0) {
    const allowed = env.ingestHostAllowlist.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`),
    );
    if (!allowed) throw badRequest(`Host ${hostname} is not on INGEST_HOST_ALLOWLIST`);
  }

  if (env.allowPrivateNetwork) {
    return { url, resolvedAddresses: [] };
  }

  const literal = isIP(hostname);
  if (literal) {
    if (isBlockedAddress(hostname)) throw badRequest("URL resolves to a non-public address");
    return { url, resolvedAddresses: [hostname] };
  }

  let records: { address: string }[];
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw badRequest(`Could not resolve host ${hostname}`);
  }
  if (records.length === 0) throw badRequest(`Host ${hostname} did not resolve`);

  const addresses = records.map((r) => r.address);
  if (addresses.some((address) => isBlockedAddress(address))) {
    throw badRequest("URL resolves to a non-public address");
  }

  return { url, resolvedAddresses: addresses };
}
