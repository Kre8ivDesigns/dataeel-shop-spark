/**
 * Lightweight "RAG" for racing-assistant: keyword-scored chunk selection (no embeddings).
 * Shared tests: racing_rag.test.ts
 */

export type KnowledgeChunk = {
  id: string;
  /** Extra terms that boost relevance (lowercase). */
  keywords: string[];
  body: string;
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "have",
  "how",
  "what",
  "when",
  "who",
  "why",
  "with",
  "from",
  "that",
  "this",
  "your",
  "about",
  "does",
  "into",
  "just",
  "like",
  "some",
  "than",
  "then",
  "them",
  "they",
  "very",
  "will",
]);

/** Lowercase, collapse whitespace, strip punctuation for stable dedup keys. */
export function normalizeQuestionForCache(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s']/g, "");
}

export async function hashQuestionSha256(normalized: string): Promise<string> {
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tokenizeQuery(q: string): string[] {
  const words = q.toLowerCase().match(/\b[a-z][a-z0-9']{2,}\b/g) ?? [];
  const out: string[] = [];
  for (const w of words) {
    if (!STOPWORDS.has(w)) out.push(w);
  }
  return out.length ? out : words;
}

function scoreChunk(queryTokens: string[], chunk: KnowledgeChunk): number {
  const hay = `${chunk.keywords.join(" ")} ${chunk.body}`.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (hay.includes(t)) {
      score += chunk.keywords.some((k) => k.includes(t) || t.includes(k)) ? 3 : 2;
    }
  }
  return score;
}

/**
 * Pick highest-scoring chunks until maxChars (excluding guard chunk).
 * If nothing matches, include the first `breadthFallback` chunks so the model still has context.
 */
export function selectKnowledgeChunks(
  userMessage: string,
  chunks: KnowledgeChunk[],
  guardChunk: KnowledgeChunk | null,
  maxChars: number,
  breadthFallback = 4,
): string {
  const tokens = tokenizeQuery(userMessage);
  const scored = chunks.map((c) => ({
    c,
    s: tokens.length ? scoreChunk(tokens, c) : 0,
  }));
  scored.sort((a, b) => b.s - a.s);

  const picked: KnowledgeChunk[] = [];
  let chars = 0;

  const tryAdd = (chunk: KnowledgeChunk) => {
    const piece = chunk.body.trim();
    if (!piece) return;
    const sep = picked.length ? "\n\n" : "";
    const nextLen = chars + sep.length + piece.length + (guardChunk ? 50 : 0);
    if (nextLen > maxChars && picked.length > 0) return false;
    picked.push(chunk);
    chars += sep.length + piece.length;
    return true;
  };

  for (const { c, s } of scored) {
    if (s > 0) {
      tryAdd(c);
      if (chars >= maxChars * 0.92) break;
    }
  }

  if (picked.length === 0) {
    for (let i = 0; i < Math.min(breadthFallback, scored.length); i++) {
      tryAdd(scored[i].c);
      if (chars >= maxChars * 0.85) break;
    }
  }

  let text = picked.map((p) => p.body.trim()).join("\n\n");
  if (guardChunk?.body.trim()) {
    text = `${text}\n\n---\n${guardChunk.body.trim()}`;
  }
  return text.trim();
}

/** Split admin DB override into pseudo-chunks for the same scorer. */
export function paragraphsToChunks(adminBody: string, prefix: string): KnowledgeChunk[] {
  return adminBody
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40)
    .map((body, i) => ({
      id: `${prefix}_${i}`,
      keywords: ["admin", "custom"],
      body,
    }));
}
