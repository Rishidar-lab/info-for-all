/**
 * Embedding abstraction (v0.5, Phase 17).
 *
 * Embeddings are used ONLY as a candidate-retrieval / secondary signal — never
 * as an unquestioned merge decision. The final identity gate still checks
 * location, time, entities, action and conflicts regardless of cosine score.
 *
 * The default `HashingEmbeddingProvider` is fully DETERMINISTIC (character
 * n-gram hashing into a fixed vector) — no network, no credential, stable in
 * tests. A real provider can be registered via `IFA_EMBEDDING_PROVIDER`; none is
 * configured for the deployed build.
 */

export interface EmbeddingProvider {
  readonly name: string;
  available(): boolean;
  /** Return unit-normalised vectors, one per input string. */
  embed(texts: string[]): Promise<number[][]>;
}

const DIM = 128;

function hashNGrams(text: string): number[] {
  const v = new Float64Array(DIM);
  const t = text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const tokens = t.split(" ").filter(Boolean);
  const grams: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) grams.push(tokens[i] + "_" + tokens[i + 1]);
  for (const g of grams) {
    let h = 2166136261;
    for (let i = 0; i < g.length; i++) {
      h ^= g.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % DIM;
    const sign = (h & 1) === 0 ? 1 : -1;
    v[idx] += sign * (1 + Math.log(1 + g.length));
  }
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return Array.from(v, (x) => x / norm);
}

export class HashingEmbeddingProvider implements EmbeddingProvider {
  readonly name = "hashing (deterministic)";
  available(): boolean {
    return true;
  }
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(hashNGrams);
  }
}

const REGISTRY = new Map<string, () => EmbeddingProvider>();
export function registerEmbeddingProvider(id: string, make: () => EmbeddingProvider): void {
  REGISTRY.set(id, make);
}

/** The configured provider, or the deterministic hashing fallback. */
export function getEmbeddingProvider(): EmbeddingProvider {
  const id = process.env.IFA_EMBEDDING_PROVIDER;
  if (id && REGISTRY.has(id)) {
    const p = REGISTRY.get(id)!();
    if (p.available()) return p;
  }
  return new HashingEmbeddingProvider();
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
  return dot;
}

/** Synchronous convenience for the deterministic provider (used in blocking). */
export function hashEmbed(text: string): number[] {
  return hashNGrams(text);
}
