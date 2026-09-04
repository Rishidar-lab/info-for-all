/**
 * Raw-record custody (§B.2.2).
 *
 * Every fetched record's raw bytes are persisted with their sha256. A record
 * that cannot be re-derived from stored bytes is not a record and cannot support
 * a published claim. In CI (`RESEARCH_OFFLINE`) adapters read ONLY from the
 * committed fixture directory — the whole research path runs with zero network.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RawRecord } from "./types";

export function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function makeRawRecord(url: string, contentType: string, body: string, now = Date.now()): RawRecord {
  const bytesB64 = Buffer.from(body, "utf8").toString("base64");
  return { sha256: sha256(body), url, fetchedAt: new Date(now).toISOString(), contentType, bytesB64 };
}

export function rawBody(r: RawRecord): string {
  return Buffer.from(r.bytesB64, "base64").toString("utf8");
}

/** Committed fixture store — a real stored response per adapter+key. */
export class FixtureStore {
  constructor(private dir: string) {}
  private path(adapter: string, key: string): string {
    return resolve(this.dir, adapter, `${key.replace(/[^a-z0-9_.-]/gi, "_")}.json`);
  }
  has(adapter: string, key: string): boolean {
    return existsSync(this.path(adapter, key));
  }
  get(adapter: string, key: string): RawRecord | null {
    const p = this.path(adapter, key);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as RawRecord;
  }
  put(adapter: string, key: string, raw: RawRecord): void {
    const p = this.path(adapter, key);
    mkdirSync(resolve(this.dir, adapter), { recursive: true });
    writeFileSync(p, JSON.stringify(raw, null, 2));
  }
  list(adapter: string): string[] {
    const d = resolve(this.dir, adapter);
    return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : [];
  }
}

/**
 * Fetch a URL as text, honouring the offline flag and caching to the fixture
 * store. Identifying User-Agent with a contact URL (§B.2.2). No retry loop, no
 * evasion — if a host blocks this UA, the adapter degrades (see the §9 note in
 * docs/releases/archive/IFFA_MILESTONE_B2_REPORT.md).
 */
export async function fetchText(
  url: string,
  opts: { adapter: string; key: string; store: FixtureStore; offline: boolean; timeoutMs?: number; now?: number },
): Promise<RawRecord | null> {
  const cached = opts.store.get(opts.adapter, opts.key);
  if (opts.offline) return cached;
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 6 * 3600_000) return cached;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), opts.timeoutMs ?? 12_000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IFFA-research/0.2; +https://github.com/Rishidar-lab/info-for-all)",
        Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8",
      },
    });
    if (!res.ok) return cached; // degrade to the fixture, never evade
    const body = await res.text();
    const raw = makeRawRecord(url, res.headers.get("content-type") ?? "text/plain", body, opts.now);
    opts.store.put(opts.adapter, opts.key, raw);
    return raw;
  } catch {
    return cached;
  } finally {
    clearTimeout(t);
  }
}
