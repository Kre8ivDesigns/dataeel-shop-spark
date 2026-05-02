/**
 * Decode common HTML/XML character references for display (RSS titles, snippets).
 * Runs multiple passes so chains like `&amp;apos;` resolve correctly.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  ndash: "\u2013",
  mdash: "\u2014",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
};

const MAX_PASSES = 32;

/** Unicode scalar value — excludes surrogates; matches String.fromCodePoint rules. */
function isAllowedCodePoint(cp: number): boolean {
  return (
    Number.isInteger(cp) &&
    cp >= 0 &&
    cp <= 0x10ffff &&
    (cp < 0xd800 || cp > 0xdfff)
  );
}

function codeUnitFromNumericEntity(cp: number, fallbackFullMatch: string): string {
  return isAllowedCodePoint(cp) ? String.fromCodePoint(cp) : fallbackFullMatch;
}

export function decodeHtmlEntities(input: string): string {
  if (input == null || typeof input !== "string") {
    return "";
  }
  let s = input;
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = decodeHtmlEntitiesOnce(s);
    if (next === s) break;
    s = next;
  }
  return s;
}

function decodeHtmlEntitiesOnce(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (full, h) => {
      const cp = parseInt(h, 16);
      return Number.isFinite(cp) ? codeUnitFromNumericEntity(cp, full) : full;
    })
    .replace(/&#(\d+);/g, (full, n) => {
      const cp = parseInt(n, 10);
      return Number.isFinite(cp) ? codeUnitFromNumericEntity(cp, full) : full;
    })
    .replace(/&([a-z]+);/gi, (full, name: string) => {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key) ? NAMED_ENTITIES[key]! : full;
    });
}
