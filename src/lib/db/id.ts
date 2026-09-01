/**
 * Collision-resistant, URL-safe identifiers. Uses the platform CSPRNG.
 * Prefixed so IDs are self-describing in logs and API responses.
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

function randomBase36(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % 36];
  return out;
}

export function createId(prefix?: string): string {
  const body = Date.now().toString(36) + randomBase36(12);
  return prefix ? `${prefix}_${body}` : body;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
