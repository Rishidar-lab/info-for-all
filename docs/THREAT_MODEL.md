# IFA Threat Model (MVP v0.1)

Scope: the IFA web application, its API, and the ingestion pipeline. Out of scope: hosting
infrastructure, the operator's OS, and the (optional) third-party model provider.

## Assets

| Asset | Why it matters |
| ----- | -------------- |
| Integrity of events / claims / CGI | IFA's entire value is trustworthy analysis; silent corruption is the worst case. |
| Provenance links | A claim without correct provenance is misinformation with a citation. |
| Server-side secrets (`AI_API_KEY`, `IFA_WRITE_TOKEN`) | Leak → cost / impersonation. |
| Availability of read endpoints | A public information tool that is down is useless. |
| The host network | Ingestion makes outbound requests on behalf of users → SSRF pivot risk. |

## Trust boundaries

1. **Browser → Next.js** (untrusted input: query strings, JSON bodies).
2. **Next.js → ingested content** (untrusted: feed XML, pasted article text, remote HTTP).
3. **Next.js → model provider** (semi-trusted: returns text that is parsed and validated).
4. **Next.js → SQLite file** (trusted, local).

## Threats & mitigations

### T1 — SSRF via ingestion
An attacker submits `POST /api/ingest` (or a feed URL) pointing at `169.254.169.254`, `localhost`,
an internal service, or a hostname that resolves to a private IP.

*Mitigations* (`src/lib/ingestion/ssrf.ts`): scheme allowlist (`http`/`https` only); reject embedded
credentials; port allowlist; reject `localhost`, `*.local`, `*.internal`, cloud-metadata hostnames;
**DNS-resolve the host and block** any answer in loopback / RFC1918 / link-local / CGNAT / multicast
ranges (v4 and v6, including `::ffff:` mapped); optional `INGEST_HOST_ALLOWLIST`; `redirect: "error"`
on fetch; 10 s timeout; response size capped at `INGEST_MAX_BYTES`.
*Residual*: DNS-rebinding between the resolve check and the fetch (TOCTOU) — acceptable for MVP;
production should pin the resolved IP or use an egress proxy.

### T2 — Injection (SQL / command / path)
*Mitigations*: all queries go through Drizzle's parameterised builder — no string interpolation, no
raw SQL in request paths. No `child_process` in request handlers. No user-controlled file paths;
`DATABASE_URL` is operator-set and validated.

### T3 — XSS / HTML injection from ingested content
*Mitigations*: `stripHtml()` removes every tag (and `<script>`/`<style>` bodies) from all ingested
title / summary / content / author fields before storage. React escapes by default; there is no
`dangerouslySetInnerHTML` anywhere. CSP in `next.config.ts` disallows external scripts and framing.

### T4 — Oversized / malformed request bodies (DoS)
*Mitigations*: JSON content-type required; `Content-Length` pre-check plus actual byte measurement
against `INGEST_MAX_BYTES`; Zod schemas cap array lengths and string sizes; feed fetch is size- and
time-bounded.

### T5 — Write-endpoint abuse
`POST /api/ingest` and `/analyze` mutate state and run the (potentially paid) model provider.
*Mitigations*: in-memory fixed-window rate limiting per client IP (10/min ingest, 20/min analyze);
optional `IFA_WRITE_TOKEN` bearer requirement; ingestion rejects duplicates.
*Residual*: in-memory limiter is per-instance — use a shared store (Redis) before horizontal scaling;
add real auth before exposing writes publicly.

### T6 — Secret leakage
*Mitigations*: secrets read only in server modules; never referenced in client components; the
logger recursively redacts keys matching `pass|secret|token|api[_-]?key|authorization|cookie|credential`;
`poweredByHeader` disabled; error responses never echo internals (generic 500 body + request id).

### T7 — Malicious / low-quality model output
A configured provider could return prompt-injected or fabricated JSON.
*Mitigations*: model output is parsed as JSON and schema-validated; claim types are constrained to
the enum; relationship endpoints must reference known claim ids; on any failure the deterministic
mock result is used. Model text is always framed in the UI as "extracted / detected", never asserted.
*Residual*: a subtly-wrong-but-valid claim can pass — this is why provenance and the "verify" framing
matter, and why extraction confidence is shown.

### T8 — Clickjacking
*Mitigations*: `X-Frame-Options: DENY` and `frame-ancestors 'none'`.

### T9 — Supply chain
*Mitigations*: pinned framework version; `npm audit` clean at build; optional AI SDKs are
`optionalDependencies` loaded lazily, so they are not in the default install or the container image.

## Non-goals for v0.1

Authentication / accounts / RBAC (beyond the write token), multi-tenant isolation, per-user data,
audit trails for reads, WAF / bot management, and rate limiting that survives a restart. These are
tracked in `docs/ROADMAP.md`.
