export type KeywordResult = {
  keyword: string;
  count: number;
  density: number;
};

export type KeywordAnalysis = {
  totalWords: number;
  uniqueWords: number;
  title: string;
  metaDescription: string;
  h1Count: number;
  h2Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  keywordResults: KeywordResult[];
  recommendations: string[];
};

const DEFAULT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "this",
  "to",
  "with",
  "you",
  "your",
]);

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ");
}

function extractTag(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]).trim().replace(/\s+/g, " ") : "";
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  return match?.[1]?.trim() ?? "";
}

function countTags(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}(\\s|>|/)`, "gi")) ?? []).length;
}

function countImagesMissingAlt(html: string): number {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  return imageTags.filter((tag) => !/\salt=(["']).+?\1/i.test(tag)).length;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[-']+|[-']+$/g, ""))
    .filter((word) => word.length > 2 && !DEFAULT_STOP_WORDS.has(word));
}

export function normalizeKeywords(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\n,]+/)
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function analyzePageSeo(input: string, keywordInput: string): KeywordAnalysis {
  const hasMarkup = /<\/?[a-z][\s\S]*>/i.test(input);
  const text = hasMarkup ? stripHtml(input) : input;
  const words = tokenize(text);
  const totalWords = words.length;
  const wordCounts = words.reduce<Record<string, number>>((acc, word) => {
    acc[word] = (acc[word] ?? 0) + 1;
    return acc;
  }, {});
  const keywords = normalizeKeywords(keywordInput);

  const keywordResults = keywords.map((keyword) => {
    const keywordWords = tokenize(keyword);
    const count =
      keywordWords.length <= 1
        ? wordCounts[keywordWords[0] ?? keyword] ?? 0
        : Math.max(0, text.toLowerCase().split(keyword.toLowerCase()).length - 1);
    return {
      keyword,
      count,
      density: totalWords > 0 ? (count / totalWords) * 100 : 0,
    };
  });

  const imageCount = hasMarkup ? countTags(input, "img") : 0;
  const imagesMissingAlt = hasMarkup ? countImagesMissingAlt(input) : 0;
  const title = hasMarkup ? extractTag(input, "title") : "";
  const metaDescription = hasMarkup ? extractMetaDescription(input) : "";
  const h1Count = hasMarkup ? countTags(input, "h1") : 0;
  const h2Count = hasMarkup ? countTags(input, "h2") : 0;

  const recommendations: string[] = [];
  if (hasMarkup && !title) recommendations.push("Add a unique title tag for the page.");
  if (hasMarkup && (metaDescription.length < 70 || metaDescription.length > 160)) {
    recommendations.push("Write a focused meta description between roughly 70 and 160 characters.");
  }
  if (hasMarkup && h1Count !== 1) recommendations.push("Use exactly one clear H1 on the page.");
  if (hasMarkup && h2Count === 0) recommendations.push("Add H2 sections so search engines can understand the page structure.");
  if (imagesMissingAlt > 0) recommendations.push("Add descriptive alt text to every meaningful image.");
  if (totalWords < 250) recommendations.push("Add more indexable body copy for the target topic.");
  if (keywordResults.some((result) => result.count === 0)) {
    recommendations.push("Include the missing target keywords naturally in headings or body copy.");
  }

  return {
    totalWords,
    uniqueWords: Object.keys(wordCounts).length,
    title,
    metaDescription,
    h1Count,
    h2Count,
    imageCount,
    imagesMissingAlt,
    keywordResults,
    recommendations,
  };
}

export function normalizeAuditUrl(value: string, origin: string): string {
  const trimmed = value.trim();
  if (!trimmed) return origin;
  if (trimmed.startsWith("/")) return `${origin.replace(/\/$/, "")}${trimmed}`;
  const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  return parsed.toString();
}
