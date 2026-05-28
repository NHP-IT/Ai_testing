import type { Chunk } from "@/lib/schemas/corpus";

export type BM25Result = { chunk: Chunk; score: number };

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

export function bm25Search(
  query: string,
  chunks: Chunk[],
  options: { k1?: number; b?: number; topN?: number; sourceFilter?: string } = {}
): BM25Result[] {
  const { k1 = 1.5, b = 0.75, topN = 5, sourceFilter } = options;

  const corpus = sourceFilter
    ? chunks.filter((c) => {
        const sf = sourceFilter.toLowerCase();
        return (
          c.source_uri?.toLowerCase().includes(sf) === true ||
          c.title.toLowerCase().includes(sf) ||
          c.tags.some((t) => t.toLowerCase().includes(sf))
        );
      })
    : chunks;

  if (corpus.length === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const docTerms = corpus.map((c) => tokenize(c.text));
  const N = docTerms.length;
  const avgdl = docTerms.reduce((sum, t) => sum + t.length, 0) / N;

  const df = new Map<string, number>();
  for (const terms of docTerms) {
    for (const term of new Set(terms)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const scored = corpus.map((chunk, i) => {
    const terms = docTerms[i];
    const dl = terms.length;
    const tf = new Map<string, number>();
    for (const term of terms) tf.set(term, (tf.get(term) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const termDf = df.get(term) ?? 0;
      if (termDf === 0) continue;
      const idf = Math.log((N - termDf + 0.5) / (termDf + 0.5) + 1);
      const termTf = tf.get(term) ?? 0;
      const numerator = termTf * (k1 + 1);
      const denominator = termTf + k1 * (1 - b + b * (dl / avgdl));
      score += idf * (numerator / denominator);
    }

    return { chunk, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, z) => z.score - a.score)
    .slice(0, topN);
}
